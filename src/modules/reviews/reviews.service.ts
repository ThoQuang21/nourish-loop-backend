import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tạo đánh giá: chỉ sau khi giao dịch hoàn tất, người đánh giá phải thuộc giao dịch. */
  async create(dto: CreateReviewDto) {
    const txn = await this.prisma.transaction.findUnique({
      where: { id: dto.transactionId },
      select: { id: true, providerId: true, receiverId: true, completedAt: true },
    });
    if (!txn) {
      throw new NotFoundException(`Không tìm thấy giao dịch ${dto.transactionId}`);
    }
    if (!txn.completedAt) {
      throw new BadRequestException('Chỉ đánh giá sau khi giao dịch hoàn tất');
    }

    // Xác định người được đánh giá (đối phương trong giao dịch).
    let rateeId: string;
    if (dto.raterId === txn.providerId) {
      rateeId = txn.receiverId;
    } else if (dto.raterId === txn.receiverId) {
      rateeId = txn.providerId;
    } else {
      throw new ForbiddenException('Bạn không thuộc giao dịch này');
    }

    try {
      await this.prisma.review.create({
        data: {
          transactionId: dto.transactionId,
          raterId: dto.raterId,
          rateeId,
          score: dto.score,
          comment: dto.comment,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Bạn đã đánh giá giao dịch này rồi');
      }
      throw e;
    }

    const trustScore = await this.recomputeTrustScore(rateeId);
    return { success: true, rateeId, trustScore };
  }

  /** Cập nhật trustScore của user = trung bình điểm các đánh giá nhận được. */
  private async recomputeTrustScore(userId: string): Promise<number> {
    const agg = await this.prisma.review.aggregate({
      where: { rateeId: userId },
      _avg: { score: true },
    });
    const avg = Math.round((agg._avg.score ?? 0) * 10) / 10;
    await this.prisma.profile.updateMany({
      where: { userId },
      data: { trustScore: avg },
    });
    return avg;
  }

  /** Danh sách đánh giá NHẬN ĐƯỢC của một user (cho trang hồ sơ). */
  async getForUser(userId?: string) {
    if (!userId) return [];
    const reviews = await this.prisma.review.findMany({
      where: { rateeId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        rater: {
          select: { fullName: true, avatarUrl: true, profile: { select: { org: true } } },
        },
      },
    });
    return reviews.map((r) => ({
      id: r.id,
      score: r.score,
      comment: r.comment ?? '',
      raterName: r.rater.fullName,
      raterOrg: r.rater.profile?.org ?? '',
      raterAvatar: r.rater.avatarUrl ?? '',
      daysAgo: Math.floor((Date.now() - r.createdAt.getTime()) / 86_400_000),
    }));
  }
}

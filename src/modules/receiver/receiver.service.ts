import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Request, VerificationLevel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  mapPostToFrontend,
  normalizeFoodCategory,
  normalizePostStatus,
} from '../provider/provider-contract';
import { CreateRequestDto } from './dto/create-request.dto';
import { QueryPublicPostDto } from './dto/query-post.dto';
import { QueryRequestDto } from './dto/query-request.dto';

/** Map provider (User + Profile) sang shape FE đang dùng (mock Provider). */
function mapProviderToFrontend(provider: {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  profile?: {
    org: string | null;
    address: string | null;
    level: VerificationLevel;
    trustScore: number;
    totalKg: number;
    totalDeals: number;
  } | null;
}) {
  return {
    id: provider.id,
    name: provider.fullName,
    org: provider.profile?.org ?? '',
    level: provider.profile?.level === 'VERIFIED' ? 'verified' : 'community',
    trustScore: provider.profile?.trustScore ?? 0,
    totalKg: provider.profile?.totalKg ?? 0,
    totalDeals: provider.profile?.totalDeals ?? 0,
    avatar: provider.avatarUrl ?? '',
    address: provider.profile?.address ?? '',
  };
}

/**
 * Module RECEIVER — các tính năng phía người nhận.
 * Hiện có: CRUD yêu cầu nhận. (Các tính năng receiver khác sẽ thêm vào đây.)
 * Định danh receiver tạm lấy từ body (receiverId) — sẽ chuyển sang token sau.
 */
@Injectable()
export class ReceiverService {
  constructor(private readonly prisma: PrismaService) {}

  /** Đăng ký nhận: chỉ cho tin OPEN, mỗi receiver 1 yêu cầu/tin. */
  async createRequest(dto: CreateRequestDto): Promise<Request> {
    const post = await this.prisma.foodPost.findUnique({
      where: { id: dto.postId },
    });
    if (!post) {
      throw new NotFoundException(`Không tìm thấy tin đăng ${dto.postId}`);
    }
    if (post.status !== 'OPEN') {
      throw new ConflictException(
        `Tin này không còn nhận yêu cầu (trạng thái: ${post.status})`,
      );
    }

    try {
      return await this.prisma.request.create({
        data: {
          postId: dto.postId,
          receiverId: dto.receiverId,
          distanceKm: dto.distanceKm,
          message: dto.message,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new ConflictException('Bạn đã gửi yêu cầu cho tin này rồi');
        }
        if (e.code === 'P2003') {
          throw new BadRequestException('receiverId không hợp lệ');
        }
      }
      throw e;
    }
  }

  /** Danh sách yêu cầu của tôi (lọc theo receiverId + status). */
  findRequests(query: QueryRequestDto): Promise<Request[]> {
    return this.prisma.request.findMany({
      where: {
        ...(query.receiverId ? { receiverId: query.receiverId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            category: true,
            weightKg: true,
            status: true,
            imageUrl: true,
            district: true,
            pickupWindow: true,
          },
        },
      },
    });
  }

  /** Chi tiết một yêu cầu (kèm tin + provider). */
  async findRequest(id: string): Promise<Request> {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: {
        post: {
          include: {
            provider: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!request) {
      throw new NotFoundException(`Không tìm thấy yêu cầu ${id}`);
    }
    return request;
  }

  /** Huỷ yêu cầu (chỉ khi đang PENDING). Không xoá cứng — đổi status CANCELLED. */
  async cancelRequest(id: string): Promise<Request> {
    const request = await this.prisma.request.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException(`Không tìm thấy yêu cầu ${id}`);
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        `Chỉ huỷ được yêu cầu đang PENDING (hiện tại: ${request.status})`,
      );
    }
    return this.prisma.request.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // ---------------- Browse tin công khai (cho receiver) ----------------

  /** Danh sách tin để receiver xem (mặc định OPEN), kèm provider, map shape FE. */
  async listPosts(query: QueryPublicPostDto) {
    const category = normalizeFoodCategory(query.category);
    const where: Prisma.FoodPostWhereInput = {
      status: normalizePostStatus(query.status) ?? 'OPEN',
      ...(category ? { category } : {}),
      ...(query.minKg ? { weightKg: { gte: Number(query.minKg) } } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    const posts = await this.prisma.foodPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { provider: { include: { profile: true } } },
    });

    return posts.map((post) => ({
      ...mapPostToFrontend(post),
      provider: mapProviderToFrontend(post.provider),
    }));
  }

  /** Chi tiết một tin cho receiver (kèm provider), map shape FE. */
  async getPost(id: string) {
    const post = await this.prisma.foodPost.findUnique({
      where: { id },
      include: { provider: { include: { profile: true } } },
    });
    if (!post) {
      throw new NotFoundException(`Không tìm thấy tin đăng ${id}`);
    }
    return {
      ...mapPostToFrontend(post),
      provider: mapProviderToFrontend(post.provider),
    };
  }
}

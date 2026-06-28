import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { UpdateMatchingSettingsDto } from './dto/update-matching-settings.dto';

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

  /**
   * Receiver bấm "Xác nhận đã nhận" để ĐÓNG ĐƠN (MVP: thay cho quét QR).
   * Chỉ với yêu cầu đã ACCEPTED. Hoàn tất giao dịch + cập nhật số liệu 2 bên.
   */
  async confirmReceived(requestId: string, receiverId?: string) {
    if (!receiverId) {
      throw new BadRequestException('receiverId là bắt buộc');
    }
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: {
        transaction: true,
        post: { select: { id: true, title: true, weightKg: true, providerId: true } },
      },
    });
    if (!request) {
      throw new NotFoundException(`Không tìm thấy yêu cầu ${requestId}`);
    }
    if (request.receiverId !== receiverId) {
      throw new ForbiddenException('Đây không phải yêu cầu của bạn');
    }
    if (request.status === 'COMPLETED') {
      return this.findRequest(requestId); // idempotent
    }
    if (request.status !== 'ACCEPTED') {
      throw new BadRequestException('Chỉ xác nhận đơn đã được chấp nhận');
    }
    const txn = request.transaction;
    if (!txn) {
      throw new BadRequestException('Đơn chưa có giao dịch để xác nhận');
    }

    const weightKg = txn.weightKg ?? request.post.weightKg;
    const co2SavedKg = txn.co2SavedKg ?? weightKg * 2.5;
    const providerId = request.post.providerId;

    await this.prisma.$transaction([
      this.prisma.transaction.update({
        where: { id: txn.id },
        data: {
          confirmedByReceiver: true,
          confirmedByProvider: true,
          completedAt: new Date(),
          weightKg,
          co2SavedKg,
        },
      }),
      this.prisma.request.update({ where: { id: requestId }, data: { status: 'COMPLETED' } }),
      this.prisma.foodPost.update({
        where: { id: request.post.id },
        data: { status: 'COMPLETED' },
      }),
      this.prisma.profile.updateMany({
        where: { userId: receiverId },
        data: {
          totalKg: { increment: weightKg },
          totalDeals: { increment: 1 },
          currentLoadKg: { increment: weightKg },
        },
      }),
      this.prisma.profile.updateMany({
        where: { userId: providerId },
        data: { totalKg: { increment: weightKg }, totalDeals: { increment: 1 } },
      }),
      this.prisma.notification.create({
        data: {
          userId: providerId,
          type: 'ACCEPTED',
          title: 'Đơn đã hoàn tất',
          body: `Người nhận đã xác nhận nhận "${request.post.title}". Giao dịch hoàn tất.`,
          postId: request.post.id,
        },
      }),
    ]);

    return this.findRequest(requestId);
  }

  /** Lịch sử nhận: các giao dịch đã hoàn tất của receiver (kèm provider + đã đánh giá chưa). */
  async history(receiverId?: string) {
    if (!receiverId) return [];
    const txns = await this.prisma.transaction.findMany({
      where: { receiverId, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      include: {
        post: { select: { title: true, imageUrl: true } },
        provider: { select: { fullName: true, profile: { select: { org: true } } } },
        reviews: { where: { raterId: receiverId }, select: { score: true } },
      },
    });
    return txns.map((t) => ({
      id: t.id,
      date: t.completedAt,
      providerName: t.provider.fullName,
      providerOrg: t.provider.profile?.org ?? '',
      item: t.post.title,
      image: t.post.imageUrl ?? '',
      kg: t.weightKg ?? 0,
      co2SavedKg: t.co2SavedKg ?? 0,
      status: 'completed',
      rated: t.reviews.length > 0,
      ratingScore: t.reviews[0]?.score ?? null,
    }));
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
      lat: post.lat,
      lng: post.lng,
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
      lat: post.lat,
      lng: post.lng,
      provider: mapProviderToFrontend(post.provider),
    };
  }

  // ---------------- Cấu hình matching của receiver ----------------

  /** Lấy cấu hình matching hiện tại (capacity, danh mục nhận, bán kính, giờ hoạt động...). */
  async getMatchingSettings(receiverId?: string) {
    if (!receiverId) {
      throw new BadRequestException('receiverId là bắt buộc');
    }
    const profile = await this.prisma.profile.findUnique({
      where: { userId: receiverId },
      include: { operatingHours: { orderBy: { weekday: 'asc' } } },
    });
    if (!profile) {
      throw new NotFoundException('Không tìm thấy hồ sơ receiver');
    }
    return {
      maxCapacityKg: profile.maxCapacityKg,
      currentLoadKg: profile.currentLoadKg,
      serviceRadiusKm: profile.serviceRadiusKm,
      autoAcceptMatch: profile.autoAcceptMatch,
      matchingEnabled: profile.matchingEnabled,
      acceptsPreparedMeals: profile.acceptsPreparedMeals,
      acceptsBreadCereal: profile.acceptsBreadCereal,
      acceptsVegetables: profile.acceptsVegetables,
      acceptsFruits: profile.acceptsFruits,
      acceptsDairy: profile.acceptsDairy,
      acceptsDryGoods: profile.acceptsDryGoods,
      acceptsOther: profile.acceptsOther,
      operatingHours: profile.operatingHours.map((h) => ({
        weekday: h.weekday,
        openTime: h.openTime,
        closeTime: h.closeTime,
        isActive: h.isActive,
      })),
    };
  }

  /** Cập nhật cấu hình matching (chỉ field nào gửi mới đổi; operatingHours thì thay toàn bộ). */
  async updateMatchingSettings(dto: UpdateMatchingSettingsDto) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId: dto.receiverId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Không tìm thấy hồ sơ receiver');
    }

    const data: Prisma.ProfileUpdateInput = {};
    const setIf = <K extends keyof Prisma.ProfileUpdateInput>(key: K, value: unknown) => {
      if (value !== undefined) data[key] = value as Prisma.ProfileUpdateInput[K];
    };
    setIf('maxCapacityKg', dto.maxCapacityKg);
    setIf('currentLoadKg', dto.currentLoadKg);
    setIf('serviceRadiusKm', dto.serviceRadiusKm);
    setIf('autoAcceptMatch', dto.autoAcceptMatch);
    setIf('matchingEnabled', dto.matchingEnabled);
    setIf('acceptsPreparedMeals', dto.acceptsPreparedMeals);
    setIf('acceptsBreadCereal', dto.acceptsBreadCereal);
    setIf('acceptsVegetables', dto.acceptsVegetables);
    setIf('acceptsFruits', dto.acceptsFruits);
    setIf('acceptsDairy', dto.acceptsDairy);
    setIf('acceptsDryGoods', dto.acceptsDryGoods);
    setIf('acceptsOther', dto.acceptsOther);

    if (Object.keys(data).length > 0) {
      await this.prisma.profile.update({ where: { id: profile.id }, data });
    }

    if (dto.operatingHours) {
      await this.prisma.$transaction([
        this.prisma.consumerOperatingHour.deleteMany({ where: { profileId: profile.id } }),
        this.prisma.consumerOperatingHour.createMany({
          data: dto.operatingHours.map((h) => ({
            profileId: profile.id,
            weekday: h.weekday,
            openTime: h.openTime,
            closeTime: h.closeTime,
            isActive: h.isActive ?? true,
          })),
        }),
      ]);
    }

    return this.getMatchingSettings(dto.receiverId);
  }
}

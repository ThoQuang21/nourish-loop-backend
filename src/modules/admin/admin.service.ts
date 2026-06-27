import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  RequestStatus,
  StoryStatus,
  VerificationLevel,
  VerificationRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  formatRelativeTime,
  mapPostToFrontend,
  mapRequestToFrontend,
  normalizePostStatus,
} from '../provider/provider-contract';

const CARBON_FACTOR = 2.5;

type UserWithProfile = {
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
};

function mapProvider(u: UserWithProfile) {
  return {
    id: u.id,
    name: u.fullName,
    org: u.profile?.org ?? '',
    avatar: u.avatarUrl ?? '',
    address: u.profile?.address ?? '',
    level: u.profile?.level === 'VERIFIED' ? 'verified' : 'community',
    trustScore: u.profile?.trustScore ?? 0,
    totalKg: u.profile?.totalKg ?? 0,
    totalDeals: u.profile?.totalDeals ?? 0,
  };
}

function mapReceiver(u: UserWithProfile) {
  return {
    id: u.id,
    name: u.fullName,
    org: u.profile?.org ?? '',
    avatar: u.avatarUrl ?? '',
    address: u.profile?.address ?? '',
    type: 'ngo',
    verified: u.profile?.level === 'VERIFIED',
    trustScore: u.profile?.trustScore ?? 0,
    totalReceivedKg: u.profile?.totalKg ?? 0,
    totalDeals: u.profile?.totalDeals ?? 0,
  };
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------- DASHBOARD --------------------
  async dashboard() {
    const [
      verifiedCount,
      openPosts,
      deals,
      partners,
      txnAgg,
      pendingVerifications,
      pendingRequests,
      pendingStories,
      verifs,
      communityProviders,
      communityReceivers,
    ] = await Promise.all([
      this.prisma.profile.count({ where: { level: 'VERIFIED' } }),
      this.prisma.foodPost.count({ where: { status: 'OPEN' } }),
      this.prisma.request.count({ where: { status: 'COMPLETED' } }),
      this.prisma.user.count({ where: { role: { in: ['PROVIDER', 'RECEIVER'] } } }),
      this.prisma.transaction.aggregate({ _sum: { weightKg: true, co2SavedKg: true } }),
      this.prisma.verificationRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.request.count({ where: { status: 'PENDING' } }),
      this.prisma.story.count({ where: { status: 'PENDING' } }),
      this.prisma.verificationRequest.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
      this.prisma.user.findMany({
        where: { role: 'PROVIDER', profile: { level: 'COMMUNITY' } },
        include: { profile: true },
        take: 2,
      }),
      this.prisma.user.findMany({
        where: { role: 'RECEIVER', profile: { level: 'COMMUNITY' } },
        include: { profile: true },
        take: 2,
      }),
    ]);

    const totalKg = txnAgg._sum.weightKg ?? 0;
    const co2Kg = txnAgg._sum.co2SavedKg ?? totalKg * CARBON_FACTOR;

    return {
      stats: {
        verifiedCount,
        openPosts,
        deals,
        totalKg,
        co2Tons: Math.round((co2Kg / 1000) * 10) / 10,
        partners,
      },
      pending: {
        verifications: pendingVerifications,
        requests: pendingRequests,
        stories: pendingStories,
      },
      pendingVerifications: verifs.map((v) => this.mapVerification(v)),
      unverifiedProviders: communityProviders.map(mapProvider),
      unverifiedReceivers: communityReceivers.map(mapReceiver),
    };
  }

  // -------------------- POSTS --------------------
  async listPosts(status?: string) {
    const norm = normalizePostStatus(status);
    const posts = await this.prisma.foodPost.findMany({
      where: norm ? { status: norm } : {},
      orderBy: { createdAt: 'desc' },
      include: { provider: { include: { profile: true } } },
    });
    return posts.map((p) => ({
      ...mapPostToFrontend(p),
      provider: mapProvider(p.provider),
    }));
  }

  async expirePost(id: string) {
    await this.ensurePost(id);
    const post = await this.prisma.foodPost.update({
      where: { id },
      data: { status: 'EXPIRED' },
      include: { provider: { include: { profile: true } } },
    });
    return { ...mapPostToFrontend(post), provider: mapProvider(post.provider) };
  }

  async deletePost(id: string) {
    await this.ensurePost(id);
    try {
      await this.prisma.foodPost.delete({ where: { id } });
      return { success: true, deleted: true };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        // Còn giao dịch tham chiếu -> không xoá cứng, chuyển sang hết hạn.
        await this.prisma.foodPost.update({ where: { id }, data: { status: 'EXPIRED' } });
        return { success: true, deleted: false, note: 'Đã có giao dịch — chuyển sang hết hạn thay vì xoá' };
      }
      throw e;
    }
  }

  private async ensurePost(id: string) {
    const exists = await this.prisma.foodPost.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException(`Không tìm thấy tin đăng ${id}`);
  }

  // -------------------- REQUESTS --------------------
  async listRequests(status?: string) {
    const norm = this.normalizeRequestStatus(status);
    const requests = await this.prisma.request.findMany({
      where: norm ? { status: norm } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        receiver: { include: { profile: true } },
        transaction: true,
        post: { select: { title: true, imageUrl: true, provider: { include: { profile: true } } } },
      },
    });
    return requests.map((r) => ({
      ...mapRequestToFrontend(r),
      postTitle: r.post?.title ?? '',
      postImage: r.post?.imageUrl ?? '',
      providerOrg: r.post?.provider?.profile?.org ?? '',
    }));
  }

  async updateRequestStatus(id: string, status: string) {
    const norm = this.normalizeRequestStatus(status);
    if (!norm) throw new BadRequestException(`Trạng thái không hợp lệ: ${status}`);
    const existing = await this.prisma.request.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException(`Không tìm thấy yêu cầu ${id}`);
    const r = await this.prisma.request.update({
      where: { id },
      data: { status: norm },
      include: { receiver: { include: { profile: true } }, transaction: true },
    });
    return mapRequestToFrontend(r);
  }

  private normalizeRequestStatus(value?: string): RequestStatus | undefined {
    if (!value) return undefined;
    const up = value.toUpperCase();
    return (['PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED', 'CANCELLED'] as const).includes(
      up as RequestStatus,
    )
      ? (up as RequestStatus)
      : undefined;
  }

  // -------------------- STORIES --------------------
  async listStories(status?: string) {
    const norm = this.normalizeStoryStatus(status);
    const stories = await this.prisma.story.findMany({
      where: norm ? { status: norm } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        author: { include: { profile: true } },
        thanksToProvider: { include: { profile: true } },
      },
    });
    return stories.map((s) => ({
      id: s.id,
      author: s.author.fullName,
      org: s.author.profile?.org ?? '',
      avatar: s.author.avatarUrl ?? '',
      image: s.imageUrl ?? '',
      text: s.text,
      thanksTo: s.thanksToProvider?.profile?.org ?? s.thanksToProvider?.fullName ?? '',
      daysAgo: Math.floor((Date.now() - s.createdAt.getTime()) / 86_400_000),
      likes: s.likes,
      status: s.status.toLowerCase(),
    }));
  }

  async updateStoryStatus(id: string, status: string) {
    const norm = this.normalizeStoryStatus(status);
    if (!norm) throw new BadRequestException(`Trạng thái story không hợp lệ: ${status}`);
    const existing = await this.prisma.story.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException(`Không tìm thấy story ${id}`);
    const s = await this.prisma.story.update({ where: { id }, data: { status: norm } });
    return { id: s.id, status: s.status.toLowerCase() };
  }

  private normalizeStoryStatus(value?: string): StoryStatus | undefined {
    if (!value) return undefined;
    const up = value.toUpperCase();
    return (['PENDING', 'PUBLISHED', 'HIDDEN'] as const).includes(up as StoryStatus)
      ? (up as StoryStatus)
      : undefined;
  }

  // -------------------- USERS --------------------
  async listUsers(role: 'provider' | 'receiver') {
    const users = await this.prisma.user.findMany({
      where: { role: role === 'provider' ? 'PROVIDER' : 'RECEIVER' },
      orderBy: { createdAt: 'desc' },
      include: { profile: true },
    });
    return users.map((u) => (role === 'provider' ? mapProvider(u) : mapReceiver(u)));
  }

  async setVerification(id: string, verified: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: { profile: true } });
    if (!user) throw new NotFoundException(`Không tìm thấy user ${id}`);
    const level: VerificationLevel = verified ? 'VERIFIED' : 'COMMUNITY';
    await this.prisma.profile.update({ where: { userId: id }, data: { level } });
    const updated = await this.prisma.user.findUnique({ where: { id }, include: { profile: true } });
    return user.role === 'PROVIDER' ? mapProvider(updated!) : mapReceiver(updated!);
  }

  // -------------------- VERIFICATIONS --------------------
  async listVerifications(status?: string) {
    const norm = this.normalizeVerifStatus(status);
    const items = await this.prisma.verificationRequest.findMany({
      where: norm ? { status: norm } : {},
      orderBy: { createdAt: 'desc' },
    });
    return items.map((v) => this.mapVerification(v));
  }

  async updateVerificationStatus(id: string, status: string) {
    const norm = this.normalizeVerifStatus(status);
    if (!norm) throw new BadRequestException(`Trạng thái không hợp lệ: ${status}`);
    const existing = await this.prisma.verificationRequest.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException(`Không tìm thấy đơn ${id}`);
    const v = await this.prisma.verificationRequest.update({ where: { id }, data: { status: norm } });
    return this.mapVerification(v);
  }

  private mapVerification(v: {
    id: string;
    orgName: string;
    contactName: string;
    email: string;
    role: string;
    type: string | null;
    address: string | null;
    documents: string | null;
    status: VerificationRequestStatus;
    createdAt: Date;
  }) {
    return {
      id: v.id,
      orgName: v.orgName,
      contactName: v.contactName,
      email: v.email,
      role: v.role.toLowerCase(),
      type: v.type ?? '',
      address: v.address ?? '',
      documents: v.documents ?? '',
      submittedAt: formatRelativeTime(v.createdAt),
      status: v.status.toLowerCase(),
    };
  }

  private normalizeVerifStatus(value?: string): VerificationRequestStatus | undefined {
    if (!value) return undefined;
    const up = value.toUpperCase();
    return (['PENDING', 'APPROVED', 'REJECTED'] as const).includes(
      up as VerificationRequestStatus,
    )
      ? (up as VerificationRequestStatus)
      : undefined;
  }
}

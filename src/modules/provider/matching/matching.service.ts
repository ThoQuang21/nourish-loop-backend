import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FoodCategory,
  Prisma,
  UserRole,
  VerificationLevel,
  Weekday,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SmsService } from '../../sms/sms.service';
import { normalizeFoodCategory } from '../provider-contract';
import { PreviewProviderMatchDto } from './dto/preview-provider-match.dto';
import {
  haversineKm,
  inferDistrictLabel,
  normalizeVietnameseText,
  weekdayFromDate,
} from './matching.utils';

const MATCH_WEIGHTS = {
  distance: 0.4,
  rating: 0.25,
  capacity: 0.2,
  availability: 0.15,
} as const;

// Chỉ gửi thông báo gợi ý khi độ phù hợp >= ngưỡng (giảm nhiễu). Preview vẫn hiển thị đủ top.
const MATCH_NOTIFY_MIN_PERCENT = 60;

const receiverSelect = {
  id: true,
  fullName: true,
  avatarUrl: true,
  profile: {
    select: {
      org: true,
      address: true,
      district: true,
      lat: true,
      lng: true,
      level: true,
      trustScore: true,
      maxCapacityKg: true,
      currentLoadKg: true,
      acceptsPreparedMeals: true,
      acceptsBreadCereal: true,
      acceptsVegetables: true,
      acceptsFruits: true,
      acceptsDairy: true,
      acceptsDryGoods: true,
      acceptsOther: true,
      serviceRadiusKm: true,
      autoAcceptMatch: true,
      matchingEnabled: true,
      operatingHours: {
        select: {
          weekday: true,
          openTime: true,
          closeTime: true,
          isActive: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

type MatchableReceiver = Prisma.UserGetPayload<{ select: typeof receiverSelect }>;
type MatchableProfile = NonNullable<MatchableReceiver['profile']>;

type MatchDraft = {
  title?: string;
  category: FoodCategory;
  weightKg: number;
  address: string;
  district?: string;
  lat?: number | null;
  lng?: number | null;
  pickupWindow?: string;
};

type ParsedPickupWindow = {
  weekday: Weekday | null;
  startMinutes: number | null;
  endMinutes: number | null;
  flexible: boolean;
};

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
  ) {}

  async preview(providerId: string, dto: PreviewProviderMatchDto) {
    await this.ensureProvider(providerId);

    const normalizedCategory = normalizeFoodCategory(dto.category);
    if (!normalizedCategory) {
      throw new BadRequestException('Invalid category');
    }

    const draft: MatchDraft = {
      title: dto.title,
      category: normalizedCategory,
      weightKg: dto.weightKg,
      address: dto.address,
      district: dto.district ?? inferDistrictLabel(dto.address),
      lat: dto.lat,
      lng: dto.lng,
      pickupWindow: dto.pickupWindow,
    };

    const matches = await this.findTopMatches(draft);

    return {
      formula: MATCH_WEIGHTS,
      matches,
      postDraft: {
        ...draft,
        categoryLabel: dto.category,
      },
    };
  }

  async notifyTopMatchesForPost(postId: string) {
    const post = await this.prisma.foodPost.findUnique({
      where: { id: postId },
      include: {
        provider: {
          select: {
            id: true,
            fullName: true,
            profile: {
              select: {
                org: true,
              },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Provider post ${postId} not found`);
    }

    // findTopMatches đã cap top 5; lọc thêm theo ngưỡng để chỉ báo tin đủ phù hợp.
    const topMatches = await this.findTopMatches({
      title: post.title,
      category: post.category,
      weightKg: post.weightKg,
      address: post.address,
      district: post.district ?? inferDistrictLabel(post.address),
      lat: post.lat,
      lng: post.lng,
      pickupWindow: post.pickupWindow ?? undefined,
    });

    const matches = topMatches.filter(
      (match) => match.matchPercent >= MATCH_NOTIFY_MIN_PERCENT,
    );

    if (!matches.length) {
      return matches;
    }

    const providerLabel = post.provider.profile?.org ?? post.provider.fullName;
    await this.prisma.notification.createMany({
      data: matches.map((match) => ({
        userId: match.receiverId,
        type: 'REMINDER',
        title: 'Goi y bai dang moi phu hop',
        body: `${providerLabel} vua dang "${post.title}". Do phu hop ${match.matchPercent}%, he thong da dua bai dang nay vao hang doi uu tien cua ban.`,
        postId: post.id,
      })),
    });

    // Gửi SMS cho receiver có số điện thoại (dry-run nếu chưa cấu hình). Fire-and-forget.
    const recipients = await this.prisma.user.findMany({
      where: { id: { in: matches.map((m) => m.receiverId) }, phone: { not: null } },
      select: { phone: true },
    });
    for (const r of recipients) {
      void this.sms
        .notifyMatch(r.phone as string, post.title, providerLabel, post.id)
        .catch(() => undefined);
    }

    return matches;
  }

  private async findTopMatches(draft: MatchDraft) {
    const receivers = await this.prisma.user.findMany({
      where: {
        role: UserRole.RECEIVER,
        profile: {
          is: {
            matchingEnabled: true,
          },
        },
      },
      select: receiverSelect,
      orderBy: {
        createdAt: 'asc',
      },
    });

    return receivers
      .map((receiver) => this.scoreReceiver(receiver, draft))
      .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
      .sort((left, right) => right.matchScore - left.matchScore)
      .slice(0, 5);
  }

  private scoreReceiver(receiver: MatchableReceiver, draft: MatchDraft) {
    const profile = receiver.profile;
    if (!profile || !profile.matchingEnabled) {
      return null;
    }

    if (!this.acceptsCategory(profile, draft.category)) {
      return null;
    }

    const district = profile.district ?? inferDistrictLabel(profile.address);
    const distanceKm = this.resolveDistanceKm(
      draft.lat ?? null,
      draft.lng ?? null,
      profile.lat,
      profile.lng,
      draft.district,
      district,
    );
    const serviceRadiusKm = profile.serviceRadiusKm ?? 20;

    if (distanceKm !== null && distanceKm > serviceRadiusKm) {
      return null;
    }

    const distanceScore =
      distanceKm === null
        ? draft.district && district && normalizeVietnameseText(draft.district) === normalizeVietnameseText(district)
          ? 0.82
          : 0.55
        : clamp(1 - distanceKm / Math.max(serviceRadiusKm, 1), 0, 1);

    const ratingScore = clamp(profile.trustScore / 5, 0, 1);

    const maxCapacityKg = profile.maxCapacityKg ?? null;
    const currentLoadKg = profile.currentLoadKg ?? 0;
    const capacityLeftKg =
      maxCapacityKg === null ? null : Math.max(0, maxCapacityKg - currentLoadKg);
    if (capacityLeftKg !== null && capacityLeftKg <= 0) {
      return null;
    }

    const capacityScore =
      capacityLeftKg === null
        ? 0.55
        : clamp(capacityLeftKg / Math.max(draft.weightKg, 1), 0, 1);

    const availabilityScore = this.resolveAvailabilityScore(
      profile.operatingHours,
      draft.pickupWindow,
    );

    const matchScore =
      MATCH_WEIGHTS.distance * distanceScore +
      MATCH_WEIGHTS.rating * ratingScore +
      MATCH_WEIGHTS.capacity * capacityScore +
      MATCH_WEIGHTS.availability * availabilityScore;

    const matchPercent = Math.round(matchScore * 100);

    return {
      receiverId: receiver.id,
      receiverName: receiver.fullName,
      receiverOrg: profile.org ?? '',
      receiverAddress: profile.address ?? '',
      verified: profile.level === VerificationLevel.VERIFIED,
      trustScore: Number(profile.trustScore.toFixed(1)),
      distanceKm:
        distanceKm === null ? null : Number(distanceKm.toFixed(distanceKm < 10 ? 1 : 0)),
      capacityLeftKg:
        capacityLeftKg === null
          ? null
          : Number(capacityLeftKg.toFixed(capacityLeftKg < 10 ? 1 : 0)),
      availabilityLabel: this.resolveAvailabilityLabel(
        availabilityScore,
        profile.operatingHours,
      ),
      autoAcceptMatch: profile.autoAcceptMatch,
      matchScore: Number(matchScore.toFixed(4)),
      matchPercent,
      reasons: this.buildReasons({
        distanceKm,
        trustScore: profile.trustScore,
        capacityLeftKg,
        availabilityScore,
      }),
      breakdown: {
        distanceScore: Number(distanceScore.toFixed(4)),
        ratingScore: Number(ratingScore.toFixed(4)),
        capacityScore: Number(capacityScore.toFixed(4)),
        availabilityScore: Number(availabilityScore.toFixed(4)),
      },
    };
  }

  private acceptsCategory(profile: MatchableProfile, category: FoodCategory) {
    switch (category) {
      case 'PREPARED_MEAL':
        return profile?.acceptsPreparedMeals ?? true;
      case 'BREAD_CEREAL':
        return profile?.acceptsBreadCereal ?? true;
      case 'VEGETABLES':
        return profile?.acceptsVegetables ?? true;
      case 'FRUITS':
        return profile?.acceptsFruits ?? true;
      case 'DAIRY':
        return profile?.acceptsDairy ?? true;
      case 'DRY_GOODS':
        return profile?.acceptsDryGoods ?? true;
      default:
        return profile?.acceptsOther ?? true;
    }
  }

  private resolveDistanceKm(
    draftLat: number | null,
    draftLng: number | null,
    receiverLat: number | null,
    receiverLng: number | null,
    draftDistrict?: string,
    receiverDistrict?: string | null,
  ) {
    if (
      draftLat !== null &&
      draftLng !== null &&
      receiverLat !== null &&
      receiverLng !== null
    ) {
      return haversineKm(draftLat, draftLng, receiverLat, receiverLng);
    }

    if (draftDistrict && receiverDistrict) {
      return normalizeVietnameseText(draftDistrict) ===
        normalizeVietnameseText(receiverDistrict)
        ? 2.5
        : 7.5;
    }

    return null;
  }

  private resolveAvailabilityScore(
    operatingHours: MatchableProfile['operatingHours'],
    pickupWindow?: string,
  ) {
    const activeHours = operatingHours.filter((entry) => entry.isActive);
    if (!activeHours.length) {
      return 0.55;
    }

    if (!pickupWindow) {
      return 0.65;
    }

    const parsedWindow = this.parsePickupWindow(pickupWindow);
    if (parsedWindow.flexible) {
      return 0.78;
    }

    if (
      parsedWindow.weekday === null ||
      parsedWindow.startMinutes === null ||
      parsedWindow.endMinutes === null
    ) {
      return 0.62;
    }

    const schedule = activeHours.find((entry) => entry.weekday === parsedWindow.weekday);
    if (!schedule) {
      return 0.1;
    }

    const openMinutes = this.toMinutes(schedule.openTime);
    const closeMinutes = this.toMinutes(schedule.closeTime);
    if (openMinutes === null || closeMinutes === null) {
      return 0.6;
    }

    const overlaps =
      parsedWindow.startMinutes < closeMinutes &&
      parsedWindow.endMinutes > openMinutes;
    if (overlaps) {
      return 1;
    }

    const outsideMinutes = Math.min(
      Math.abs(parsedWindow.startMinutes - closeMinutes),
      Math.abs(parsedWindow.endMinutes - openMinutes),
    );

    return outsideMinutes <= 60 ? 0.65 : 0.18;
  }

  private resolveAvailabilityLabel(
    availabilityScore: number,
    operatingHours: MatchableProfile['operatingHours'],
  ) {
    const activeDays = operatingHours.filter((entry) => entry.isActive).length;
    if (!activeDays) {
      return 'Chua khai bao lich hoat dong';
    }
    if (availabilityScore >= 0.85) {
      return 'Phu hop khung gio';
    }
    if (availabilityScore >= 0.6) {
      return 'Can hen linh hoat';
    }
    return 'Ngoai khung gio uu tien';
  }

  private buildReasons(input: {
    distanceKm: number | null;
    trustScore: number;
    capacityLeftKg: number | null;
    availabilityScore: number;
  }) {
    const reasons = [
      input.distanceKm === null
        ? 'Cung khu vuc uu tien'
        : `Cach diem lay ${input.distanceKm.toFixed(input.distanceKm < 10 ? 1 : 0)} km`,
      `Uy tin ${input.trustScore.toFixed(1)}/5`,
    ];

    if (input.capacityLeftKg !== null) {
      reasons.push(`Con suc chua ${input.capacityLeftKg.toFixed(0)} kg`);
    }

    if (input.availabilityScore >= 0.85) {
      reasons.push('Khung gio nhan hang trung khop');
    } else if (input.availabilityScore >= 0.6) {
      reasons.push('Co the linh hoat dieu pho');
    }

    return reasons;
  }

  private parsePickupWindow(value: string): ParsedPickupWindow {
    const normalized = normalizeVietnameseText(value).replace(/\s+/g, ' ');
    const timeRangeMatch = normalized.match(/(\d{1,2})[:h](\d{2}).{0,5}(\d{1,2})[:h](\d{2})/);
    const weekday = this.resolveWeekday(normalized);

    if (
      normalized.includes('linh hoat') ||
      normalized.includes('ca ngay') ||
      normalized.includes('tuan nay')
    ) {
      return {
        weekday,
        startMinutes: null,
        endMinutes: null,
        flexible: true,
      };
    }

    if (!timeRangeMatch) {
      return {
        weekday,
        startMinutes: null,
        endMinutes: null,
        flexible: false,
      };
    }

    const startMinutes =
      Number(timeRangeMatch[1]) * 60 + Number(timeRangeMatch[2]);
    const endMinutes =
      Number(timeRangeMatch[3]) * 60 + Number(timeRangeMatch[4]);

    return {
      weekday,
      startMinutes,
      endMinutes,
      flexible: false,
    };
  }

  private resolveWeekday(normalizedWindow: string) {
    const now = new Date();

    if (normalizedWindow.includes('hom nay')) {
      return weekdayFromDate(now);
    }

    if (normalizedWindow.includes('ngay mai') || normalizedWindow.endsWith(' mai')) {
      const tomorrow = new Date(now.getTime() + 86_400_000);
      return weekdayFromDate(tomorrow);
    }

    return weekdayFromDate(now);
  }

  private toMinutes(value: string) {
    const match = value.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      return null;
    }

    return Number(match[1]) * 60 + Number(match[2]);
  }

  private async ensureProvider(providerId: string) {
    const provider = await this.prisma.user.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException(`Provider ${providerId} not found`);
    }

    if (provider.role !== UserRole.PROVIDER) {
      throw new ForbiddenException('Current user is not a provider');
    }
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

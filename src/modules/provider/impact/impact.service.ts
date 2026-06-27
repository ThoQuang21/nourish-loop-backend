import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ImpactService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(providerId: string) {
    const provider = await this.ensureProvider(providerId);

    const [postsByStatus, completedTransactions, unreadNotifications] = await Promise.all([
      this.prisma.foodPost.groupBy({
        by: ['status'],
        where: { providerId },
        _count: {
          _all: true,
        },
      }),
      this.prisma.transaction.aggregate({
        where: {
          providerId,
          completedAt: {
            not: null,
          },
        },
        _count: {
          _all: true,
        },
        _sum: {
          weightKg: true,
          co2SavedKg: true,
        },
      }),
      this.prisma.notification.count({
        where: {
          userId: providerId,
          read: false,
        },
      }),
    ]);

    const postCounts = {
      OPEN: 0,
      MATCHED: 0,
      COMPLETED: 0,
      EXPIRED: 0,
    };

    for (const item of postsByStatus) {
      postCounts[item.status] = item._count._all;
    }

    return {
      provider: {
        id: provider.id,
        fullName: provider.fullName,
        email: provider.email,
        profile: provider.profile,
      },
      stats: {
        posts: postCounts,
        completedDeals: completedTransactions._count._all,
        totalKgShared:
          completedTransactions._sum.weightKg ?? provider.profile?.totalKg ?? 0,
        totalCo2SavedKg: completedTransactions._sum.co2SavedKg ?? 0,
        unreadNotifications,
      },
    };
  }

  async getWeekly(providerId: string) {
    await this.ensureProvider(providerId);

    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        providerId,
        completedAt: {
          gte: start,
          not: null,
        },
      },
      orderBy: {
        completedAt: 'asc',
      },
      select: {
        completedAt: true,
        weightKg: true,
        co2SavedKg: true,
      },
    });

    const buckets = new Map<string, { date: string; deals: number; kg: number; co2SavedKg: number }>();

    for (let i = 0; i < 7; i += 1) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      const key = current.toISOString().slice(0, 10);
      buckets.set(key, {
        date: key,
        deals: 0,
        kg: 0,
        co2SavedKg: 0,
      });
    }

    for (const item of transactions) {
      const key = item.completedAt?.toISOString().slice(0, 10);
      if (!key || !buckets.has(key)) {
        continue;
      }

      const bucket = buckets.get(key)!;
      bucket.deals += 1;
      bucket.kg += item.weightKg ?? 0;
      bucket.co2SavedKg += item.co2SavedKg ?? 0;
    }

    return Array.from(buckets.values());
  }

  private async ensureProvider(providerId: string) {
    const provider = await this.prisma.user.findUnique({
      where: { id: providerId },
      include: {
        profile: true,
      },
    });

    if (!provider) {
      throw new NotFoundException(`Provider ${providerId} not found`);
    }

    if (provider.role !== 'PROVIDER') {
      throw new ForbiddenException('Current user is not a provider');
    }

    return provider;
  }
}

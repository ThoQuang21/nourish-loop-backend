import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { mapNotificationToFrontend } from '../provider-contract';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: QueryNotificationsDto) {
    await this.ensureProvider(userId);

    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(query.unread === undefined ? {} : { read: query.unread ? false : undefined }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return notifications.map(mapNotificationToFrontend);
  }

  async markAsRead(userId: string, notificationId: string) {
    await this.ensureProvider(userId);

    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return mapNotificationToFrontend(updated);
  }

  private async ensureProvider(providerId: string) {
    const provider = await this.prisma.user.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        role: true,
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

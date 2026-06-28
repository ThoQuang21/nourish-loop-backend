import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { mapNotificationToFrontend } from '../provider/provider-contract';

/**
 * Notifications dùng chung cho MỌI vai trò (không kiểm role) — đọc theo userId.
 * Dùng cho cả receiver nhận gợi ý matching lẫn provider.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, unread?: boolean) {
    const items = await this.prisma.notification.findMany({
      where: { userId, ...(unread === undefined ? {} : { read: !unread }) },
      orderBy: { createdAt: 'desc' },
    });
    return items.map(mapNotificationToFrontend);
  }

  async markAsRead(userId: string, id: string) {
    const found = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!found) {
      throw new NotFoundException(`Không tìm thấy thông báo ${id}`);
    }
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    return mapNotificationToFrontend(updated);
  }

  async markAllRead(userId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { updated: res.count };
  }
}

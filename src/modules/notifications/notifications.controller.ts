import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { NotificationsService } from './notifications.service';

/**
 * Routes: /api/notifications — dùng chung mọi vai trò (đọc theo header x-user-id).
 */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@CurrentUserId() userId: string, @Query('unread') unread?: string) {
    return this.notificationsService.findAll(
      userId,
      unread === undefined ? undefined : unread === 'true',
    );
  }

  @Patch('read-all')
  markAll(@CurrentUserId() userId: string) {
    return this.notificationsService.markAllRead(userId);
  }

  @Patch(':id/read')
  markOne(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.notificationsService.markAsRead(userId, id);
  }
}

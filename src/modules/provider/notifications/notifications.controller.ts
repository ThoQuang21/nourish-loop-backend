import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CurrentUserId } from '../../../common/decorators/current-user-id.decorator';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@CurrentUserId() userId: string, @Query() query: QueryNotificationsDto) {
    return this.notificationsService.findAll(userId, query);
  }

  @Patch(':id/read')
  markAsRead(@CurrentUserId() userId: string, @Param('id') notificationId: string) {
    return this.notificationsService.markAsRead(userId, notificationId);
  }
}

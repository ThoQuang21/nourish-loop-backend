import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { UpdateMatchingSettingsDto } from './dto/update-matching-settings.dto';
import { ReceiverService } from './receiver.service';

/**
 * Cấu hình matching của receiver. Route: /api/receiver/settings.
 * TODO: lấy receiverId từ token thay cho body/query khi gắn auth.
 */
@Controller('receiver')
export class SettingsController {
  constructor(private readonly receiverService: ReceiverService) {}

  @Get('settings')
  get(@Query('receiverId') receiverId?: string) {
    return this.receiverService.getMatchingSettings(receiverId);
  }

  @Patch('settings')
  update(@Body() dto: UpdateMatchingSettingsDto) {
    return this.receiverService.updateMatchingSettings(dto);
  }
}

import { Body, Controller, Get, Post } from '@nestjs/common';
import { SmsService } from './sms.service';

/** Tiện ích test SMS (dry-run hoặc thật). */
@Controller('sms')
export class SmsController {
  constructor(private readonly sms: SmsService) {}

  /** Kiểm tra đã cấu hình Twilio chưa. */
  @Get('status')
  status() {
    return { enabled: this.sms.enabled, mode: this.sms.enabled ? 'live' : 'dry-run' };
  }

  /** Bắn 1 SMS thử tới 1 số (dry-run sẽ chỉ log). */
  @Post('test')
  async test(@Body() body: { phone: string; text?: string }) {
    await this.sms.send(body.phone, body.text ?? 'Food Life: tin nhan test.');
    return { mode: this.sms.enabled ? 'live' : 'dry-run', sentTo: body.phone };
  }
}

import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ZaloService } from './zalo.service';

@Controller('zalo')
export class ZaloController {
  constructor(private readonly zalo: ZaloService) {}

  /** Lấy deep link để user follow OA (kèm ref=userId). FE hiện cho người dùng. */
  @Get('link')
  link(@Query('userId') userId?: string) {
    return {
      enabled: this.zalo.enabled,
      followLink: userId ? this.zalo.followLink(userId) : null,
    };
  }

  /** (Prototype/test) Liên kết thủ công — mô phỏng webhook follow mà không cần OA thật. */
  @Post('link')
  async manualLink(@Body() body: { userId: string; zaloUserId: string }) {
    await this.zalo.linkUser(body.userId, body.zaloUserId);
    return { success: true };
  }

  /**
   * Webhook Zalo OA: sự kiện follow / nhắn tin.
   * Prototype: parse tối giản, lấy zaloUserId + ref(=userId app) để liên kết.
   * TODO (prod): verify chữ ký X-ZEvent-Signature trước khi xử lý.
   */
  @Post('webhook')
  async webhook(@Body() event: Record<string, any>) {
    const zaloUserId: string | undefined = event?.sender?.id ?? event?.follower?.id;
    const ref: string | undefined = event?.follow?.ref ?? event?.message?.text;
    if (zaloUserId && ref) {
      await this.zalo.linkUser(ref, zaloUserId).catch(() => undefined);
    }
    return { ok: true };
  }
}

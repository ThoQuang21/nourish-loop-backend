import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Tích hợp Zalo OA — mức PROTOTYPE.
 * - Nếu CHƯA cấu hình OA (thiếu ZALO_OA_ACCESS_TOKEN) → chạy "dry-run": chỉ LOG tin nhắn.
 * - Khi có OA thật: chỉ cần điền env, code gọi API thật.
 */
@Injectable()
export class ZaloService {
  private readonly logger = new Logger('Zalo');

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private get accessToken(): string | undefined {
    return this.config.get<string>('ZALO_OA_ACCESS_TOKEN');
  }

  private get appUrl(): string {
    return this.config.get<string>('APP_PUBLIC_URL') ?? 'http://localhost:8080';
  }

  get enabled(): boolean {
    return Boolean(this.accessToken);
  }

  /** Gửi tin văn bản tới user OA. Dry-run (log) nếu chưa cấu hình OA. */
  async sendText(zaloUserId: string, text: string): Promise<void> {
    if (!this.enabled) {
      this.logger.log(`[DRY-RUN] OA → ${zaloUserId}: ${text}`);
      return;
    }
    try {
      const res = await fetch('https://openapi.zalo.me/v3.0/oa/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', access_token: this.accessToken as string },
        body: JSON.stringify({ recipient: { user_id: zaloUserId }, message: { text } }),
      });
      if (!res.ok) {
        this.logger.warn(`Zalo send failed (${res.status}): ${await res.text()}`);
      }
    } catch (e) {
      this.logger.warn(`Zalo send error: ${e instanceof Error ? e.message : e}`);
    }
  }

  /** Thông báo gợi ý bài đăng phù hợp + link mở chi tiết tin. */
  async notifyMatch(
    zaloUserId: string,
    postTitle: string,
    providerLabel: string,
    postId: string,
  ): Promise<void> {
    const link = `${this.appUrl}/receiver/food/${postId}`;
    await this.sendText(
      zaloUserId,
      `🍃 ${providerLabel} vừa đăng "${postTitle}" phù hợp với bạn. Xem & đăng ký nhận: ${link}`,
    );
  }

  /** Liên kết tài khoản app ↔ Zalo (gọi từ webhook follow, hoặc thủ công khi test). */
  async linkUser(userId: string, zaloUserId: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { zaloUserId } });
    this.logger.log(`Đã liên kết user ${userId} ↔ zalo ${zaloUserId}`);
  }

  /** Deep link để user follow OA kèm ref=userId (prototype). */
  followLink(userId: string): string {
    const oaId = this.config.get<string>('ZALO_OA_ID') ?? '<ZALO_OA_ID>';
    return `https://zalo.me/${oaId}?ref=${userId}`;
  }
}

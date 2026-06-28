import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Gửi SMS — mức PROTOTYPE.
 * - Chưa cấu hình (thiếu TWILIO_*) → dry-run: chỉ LOG nội dung SMS.
 * - Có cấu hình Twilio → gửi thật. (Đổi sang gateway VN như eSMS.vn chỉ cần sửa send().)
 * Gửi thẳng tới User.phone — KHÔNG cần follow/liên kết như Zalo.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger('SMS');

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return Boolean(
      this.config.get<string>('TWILIO_ACCOUNT_SID') &&
        this.config.get<string>('TWILIO_AUTH_TOKEN') &&
        this.config.get<string>('TWILIO_FROM'),
    );
  }

  private get appUrl(): string {
    return this.config.get<string>('APP_PUBLIC_URL') ?? 'http://localhost:8080';
  }

  /** Chuẩn hoá số VN sang E.164: 0902… -> +84902…; 84… -> +84…; giữ nguyên nếu đã +. */
  private toE164(phone: string): string {
    const p = phone.trim().replace(/[\s.\-()]/g, '');
    if (p.startsWith('+')) return p;
    if (p.startsWith('0')) return '+84' + p.slice(1);
    if (p.startsWith('84')) return '+' + p;
    return p;
  }

  /** Gửi 1 SMS. Dry-run (log) nếu chưa cấu hình. */
  async send(phone: string, text: string): Promise<void> {
    const to = this.toE164(phone);
    if (!this.enabled) {
      this.logger.log(`[DRY-RUN] SMS → ${to}: ${text}`);
      return;
    }
    try {
      const sid = this.config.get<string>('TWILIO_ACCOUNT_SID') as string;
      const token = this.config.get<string>('TWILIO_AUTH_TOKEN') as string;
      const from = this.config.get<string>('TWILIO_FROM') as string;
      const body = new URLSearchParams({ To: to, From: from, Body: text }).toString();
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization:
              'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
        },
      );
      if (!res.ok) {
        this.logger.warn(`SMS failed (${res.status}): ${await res.text()}`);
      }
    } catch (e) {
      this.logger.warn(`SMS error: ${e instanceof Error ? e.message : e}`);
    }
  }

  /** Thông báo gợi ý bài đăng phù hợp (text không dấu cho thân thiện SMS). */
  async notifyMatch(
    phone: string,
    postTitle: string,
    providerLabel: string,
    postId: string,
  ): Promise<void> {
    const link = `${this.appUrl}/receiver/food/${postId}`;
    await this.send(
      phone,
      `Food Life: ${providerLabel} vua dang "${postTitle}" phu hop voi ban. Dang ky nhan: ${link}`,
    );
  }
}

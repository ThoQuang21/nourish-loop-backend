import { IsBoolean } from 'class-validator';

/** Bật/tắt xác minh cho user (provider/receiver). */
export class SetVerificationDto {
  @IsBoolean()
  verified: boolean;
}

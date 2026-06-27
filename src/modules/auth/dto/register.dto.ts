import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

/**
 * Payload đăng ký — khớp đầy đủ form FE /auth/register (đã thêm mật khẩu).
 * Tất cả field đều bắt buộc.
 *
 * Mapping với form FE:
 *   Họ và tên     -> fullName
 *   Tổ chức       -> org
 *   Email         -> email
 *   Số điện thoại -> phone
 *   Địa chỉ       -> address
 *   (toggle)      -> role  (FE gửi 'PROVIDER' | 'RECEIVER')
 *   (ô mới)       -> password
 */
export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  fullName: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsString()
  org: string;

  @IsString()
  phone: string;

  @IsString()
  address: string;
}

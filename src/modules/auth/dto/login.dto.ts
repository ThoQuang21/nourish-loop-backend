import { IsEmail, IsString } from 'class-validator';

/**
 * Payload đăng nhập (form /auth/login).
 */
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

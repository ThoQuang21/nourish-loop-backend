import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

/**
 * Payload đăng ký nhận thực phẩm (nút "Đăng ký nhận" ở /receiver/food/$id).
 */
export class CreateRequestDto {
  @IsString()
  postId: string;

  /** TẠM THỜI cho việc test trước khi gắn token. Sau này lấy từ session, bỏ field này. */
  @IsString()
  receiverId: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  distanceKm?: number;

  @IsOptional()
  @IsString()
  message?: string;
}

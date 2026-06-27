import { RequestStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

/**
 * Lọc danh sách yêu cầu (trang /receiver/requests, tabs theo status).
 */
export class QueryRequestDto {
  /** TẠM THỜI: lọc "yêu cầu của tôi". Sau này lấy receiver từ token. */
  @IsOptional()
  @IsString()
  receiverId?: string;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;
}

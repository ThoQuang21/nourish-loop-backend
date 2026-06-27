import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * Lọc danh sách tin công khai cho receiver (trang bản đồ /receiver).
 * category nhận cả enum code lẫn nhãn VN (chuẩn hoá ở service).
 */
export class QueryPublicPostDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minKg?: number;
}

import { FoodCategory } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Payload tạo tin đăng thực phẩm (từ form /provider/create).
 */
export class CreateFoodPostDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title: string;

  @IsEnum(FoodCategory)
  category: FoodCategory;

  @IsNumber()
  @IsPositive()
  weightKg: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  pickupWindow?: string;

  /** Số giờ còn dùng được, dùng để tính expiresAt. */
  @IsOptional()
  @IsNumber()
  @IsPositive()
  expiresInHours?: number;
}

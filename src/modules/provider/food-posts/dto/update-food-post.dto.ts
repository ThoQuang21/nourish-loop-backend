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

export class UpdateFoodPostDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsEnum(FoodCategory)
  category?: FoodCategory;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  weightKg?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  pickupWindow?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  expiresInHours?: number;
}

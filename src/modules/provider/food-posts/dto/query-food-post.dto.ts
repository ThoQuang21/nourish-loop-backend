import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class QueryFoodPostDto {
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
  maxDistanceKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minKg?: number;
}

import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PreviewProviderMatchDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @IsString()
  category: string;

  @IsNumber()
  @IsPositive()
  weightKg: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  pickupWindow?: string;
}

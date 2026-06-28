import { Weekday } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class OperatingHourDto {
  @IsEnum(Weekday)
  weekday: Weekday;

  @IsString()
  openTime: string; // "08:00"

  @IsString()
  closeTime: string; // "17:30"

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Cập nhật cấu hình matching của receiver (chỉ field nào gửi mới đổi). */
export class UpdateMatchingSettingsDto {
  /** TẠM THỜI: lấy từ body trước khi gắn token. */
  @IsString()
  receiverId: string;

  @IsOptional() @IsNumber() @Min(0) maxCapacityKg?: number;
  @IsOptional() @IsNumber() @Min(0) currentLoadKg?: number;
  @IsOptional() @IsNumber() @Min(0) serviceRadiusKm?: number;

  @IsOptional() @IsBoolean() autoAcceptMatch?: boolean;
  @IsOptional() @IsBoolean() matchingEnabled?: boolean;

  @IsOptional() @IsBoolean() acceptsPreparedMeals?: boolean;
  @IsOptional() @IsBoolean() acceptsBreadCereal?: boolean;
  @IsOptional() @IsBoolean() acceptsVegetables?: boolean;
  @IsOptional() @IsBoolean() acceptsFruits?: boolean;
  @IsOptional() @IsBoolean() acceptsDairy?: boolean;
  @IsOptional() @IsBoolean() acceptsDryGoods?: boolean;
  @IsOptional() @IsBoolean() acceptsOther?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperatingHourDto)
  operatingHours?: OperatingHourDto[];
}

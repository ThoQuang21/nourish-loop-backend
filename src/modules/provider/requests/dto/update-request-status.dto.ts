import { RequestStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateRequestStatusDto {
  @IsEnum(RequestStatus)
  status: RequestStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

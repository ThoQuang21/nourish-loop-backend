import { RequestStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryIncomingRequestsDto {
  @IsOptional()
  @IsString()
  postId?: string;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;
}

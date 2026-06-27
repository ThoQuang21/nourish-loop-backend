import { IsString, MinLength } from 'class-validator';

export class ConfirmTransactionDto {
  @IsString()
  @MinLength(3)
  qrCode: string;
}

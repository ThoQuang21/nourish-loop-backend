import { IsString } from 'class-validator';

/** Cập nhật trạng thái (request / story / verification). Nhận chữ thường hoặc HOA. */
export class UpdateStatusDto {
  @IsString()
  status: string;
}

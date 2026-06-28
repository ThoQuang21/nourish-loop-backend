import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Đánh giá sau giao dịch hoàn tất. */
export class CreateReviewDto {
  @IsString()
  transactionId: string;

  /** TẠM THỜI: người đánh giá lấy từ body trước khi gắn token. */
  @IsString()
  raterId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

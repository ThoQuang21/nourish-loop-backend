import { IsOptional, IsString, MinLength } from 'class-validator';

/** Payload đăng câu chuyện (composer ở /receiver/stories). */
export class CreateStoryDto {
  @IsString()
  @MinLength(5)
  text: string;

  /** TẠM THỜI: tác giả lấy từ body trước khi gắn token. */
  @IsString()
  authorId: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  thanksToProviderId?: string;
}

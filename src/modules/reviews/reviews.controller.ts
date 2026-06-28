import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

/**
 * Routes: /api/reviews — đánh giá hai chiều sau giao dịch.
 * TODO: lấy raterId từ token thay cho body khi gắn auth.
 */
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  create(@Body() dto: CreateReviewDto) {
    return this.reviewsService.create(dto);
  }

  @Get()
  forUser(@Query('userId') userId?: string) {
    return this.reviewsService.getForUser(userId);
  }
}

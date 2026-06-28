import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateStoryDto } from './dto/create-story.dto';
import { StoriesService } from './stories.service';

/**
 * Routes: /api/stories — feed câu chuyện tác động (công khai).
 * TODO: lấy authorId từ token thay cho body khi gắn auth.
 */
@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.storiesService.list(status);
  }

  @Post()
  create(@Body() dto: CreateStoryDto) {
    return this.storiesService.create(dto);
  }

  @Post(':id/like')
  like(@Param('id') id: string) {
    return this.storiesService.like(id);
  }
}

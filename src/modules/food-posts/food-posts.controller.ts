import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateFoodPostDto } from './dto/create-food-post.dto';
import { QueryFoodPostDto } from './dto/query-food-post.dto';
import { FoodPostsService } from './food-posts.service';

/**
 * Module MẪU. Routes: /api/posts
 *
 * TODO: gắn @UseGuards(JwtAuthGuard) và lấy providerId thật từ req.user
 * thay cho providerId tạm trong create().
 */
@Controller('posts')
export class FoodPostsController {
  constructor(private readonly foodPostsService: FoodPostsService) {}

  @Get()
  findAll(@Query() query: QueryFoodPostDto) {
    return this.foodPostsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.foodPostsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateFoodPostDto) {
    // TODO: thay 'demo-provider-id' bằng id user đã đăng nhập (từ JWT).
    return this.foodPostsService.create('demo-provider-id', dto);
  }
}

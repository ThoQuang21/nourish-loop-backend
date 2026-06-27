import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUserId } from '../../../common/decorators/current-user-id.decorator';
import { CreateFoodPostDto } from './dto/create-food-post.dto';
import { QueryFoodPostDto } from './dto/query-food-post.dto';
import { UpdateFoodPostDto } from './dto/update-food-post.dto';
import { FoodPostsService } from './food-posts.service';

@Controller('provider/posts')
export class FoodPostsController {
  constructor(private readonly foodPostsService: FoodPostsService) {}

  @Get()
  findMine(
    @CurrentUserId() providerId: string,
    @Query() query: QueryFoodPostDto,
  ) {
    return this.foodPostsService.findMine(providerId, query);
  }

  @Get(':id')
  findOne(
    @CurrentUserId() providerId: string,
    @Param('id') id: string,
  ) {
    return this.foodPostsService.findOne(providerId, id);
  }

  @Post()
  create(
    @CurrentUserId() providerId: string,
    @Body() dto: CreateFoodPostDto,
  ) {
    return this.foodPostsService.create(providerId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUserId() providerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFoodPostDto,
  ) {
    return this.foodPostsService.update(providerId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUserId() providerId: string,
    @Param('id') id: string,
  ) {
    return this.foodPostsService.remove(providerId, id);
  }
}

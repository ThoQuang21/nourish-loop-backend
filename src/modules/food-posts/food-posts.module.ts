import { Module } from '@nestjs/common';
import { FoodPostsController } from './food-posts.controller';
import { FoodPostsService } from './food-posts.service';

@Module({
  controllers: [FoodPostsController],
  providers: [FoodPostsService],
  exports: [FoodPostsService],
})
export class FoodPostsModule {}

import { Module } from '@nestjs/common';
import { MatchingModule } from '../matching/matching.module';
import { FoodPostsController } from './food-posts.controller';
import { FoodPostsService } from './food-posts.service';

@Module({
  imports: [MatchingModule],
  controllers: [FoodPostsController],
  providers: [FoodPostsService],
  exports: [FoodPostsService],
})
export class FoodPostsModule {}

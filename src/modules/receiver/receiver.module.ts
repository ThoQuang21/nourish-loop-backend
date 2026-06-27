import { Module } from '@nestjs/common';
import { PublicPostsController } from './public-posts.controller';
import { ReceiverController } from './receiver.controller';
import { ReceiverService } from './receiver.service';

@Module({
  controllers: [ReceiverController, PublicPostsController],
  providers: [ReceiverService],
})
export class ReceiverModule {}

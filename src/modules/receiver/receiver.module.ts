import { Module } from '@nestjs/common';
import { PublicPostsController } from './public-posts.controller';
import { ReceiverController } from './receiver.controller';
import { ReceiverService } from './receiver.service';
import { SettingsController } from './settings.controller';

@Module({
  controllers: [ReceiverController, PublicPostsController, SettingsController],
  providers: [ReceiverService],
})
export class ReceiverModule {}

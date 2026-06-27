import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { FoodPostsModule } from './modules/food-posts/food-posts.module';
import { ReceiverModule } from './modules/receiver/receiver.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    FoodPostsModule,
    ReceiverModule,
    // TODO (team chia việc): UsersModule, TransactionsModule,
    //                        ReviewsModule, StoriesModule, NotificationsModule
  ],
})
export class AppModule {}

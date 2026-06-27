import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { FoodPostsModule } from './modules/food-posts/food-posts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    FoodPostsModule,
    // TODO (team chia việc): UsersModule, RequestsModule, TransactionsModule,
    //                        ReviewsModule, StoriesModule, NotificationsModule
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProviderModule } from './modules/provider/provider.module';
import { ReceiverModule } from './modules/receiver/receiver.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { StoriesModule } from './modules/stories/stories.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    ProviderModule,
    ReceiverModule,
    AdminModule,
    StoriesModule,
    NotificationsModule,
    ReviewsModule,
  ],
})
export class AppModule {}

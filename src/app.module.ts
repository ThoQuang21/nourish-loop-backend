import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProviderModule } from './modules/provider/provider.module';
import { ReceiverModule } from './modules/receiver/receiver.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    ProviderModule,
    // TODO (team chia viec): UsersModule, ConsumerModule, ReviewsModule, StoriesModule
    ReceiverModule,
    // TODO (team chia việc): UsersModule, TransactionsModule,
    //                        ReviewsModule, StoriesModule, NotificationsModule
  ],
})
export class AppModule {}

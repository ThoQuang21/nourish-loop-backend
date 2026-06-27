import { Module } from '@nestjs/common';
import { FoodPostsModule } from './food-posts/food-posts.module';
import { ImpactModule } from './impact/impact.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RequestsModule } from './requests/requests.module';
import { TransactionsModule } from './transactions/transactions.module';

/**
 * Nhóm toàn bộ nghiệp vụ phía Provider.
 */
@Module({
  imports: [
    FoodPostsModule,
    RequestsModule,
    TransactionsModule,
    ImpactModule,
    NotificationsModule,
  ],
})
export class ProviderModule {}

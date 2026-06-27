import { Body, Controller, Param, Post } from '@nestjs/common';
import { CurrentUserId } from '../../../common/decorators/current-user-id.decorator';
import { ConfirmTransactionDto } from './dto/confirm-transaction.dto';
import { TransactionsService } from './transactions.service';

@Controller('provider/transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post(':id/confirm')
  confirm(
    @CurrentUserId() providerId: string,
    @Param('id') transactionId: string,
    @Body() dto: ConfirmTransactionDto,
  ) {
    return this.transactionsService.confirm(providerId, transactionId, dto);
  }
}

import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CurrentUserId } from '../../../common/decorators/current-user-id.decorator';
import { QueryIncomingRequestsDto } from './dto/query-incoming-requests.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { RequestsService } from './requests.service';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get('incoming')
  findIncoming(@CurrentUserId() providerId: string, @Query() query: QueryIncomingRequestsDto) {
    return this.requestsService.findIncoming(providerId, query);
  }

  @Patch(':id')
  updateStatus(
    @CurrentUserId() providerId: string,
    @Param('id') requestId: string,
    @Body() dto: UpdateRequestStatusDto,
  ) {
    return this.requestsService.updateStatus(providerId, requestId, dto);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateRequestDto } from './dto/create-request.dto';
import { QueryRequestDto } from './dto/query-request.dto';
import { ReceiverService } from './receiver.service';

/**
 * Module receiver. Route giữ là /api/requests (không đổi path).
 *
 * TODO: lấy receiverId từ session token thay cho body khi gắn auth.
 */
@Controller('requests')
export class ReceiverController {
  constructor(private readonly receiverService: ReceiverService) {}

  @Post()
  create(@Body() dto: CreateRequestDto) {
    return this.receiverService.createRequest(dto);
  }

  @Get()
  findAll(@Query() query: QueryRequestDto) {
    return this.receiverService.findRequests(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.receiverService.findRequest(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.receiverService.cancelRequest(id);
  }
}

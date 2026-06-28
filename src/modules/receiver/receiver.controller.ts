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

  // Đặt trước ':id' để không bị nuốt vào param.
  @Get('history')
  history(@Query('receiverId') receiverId?: string) {
    return this.receiverService.history(receiverId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.receiverService.findRequest(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.receiverService.cancelRequest(id);
  }

  // Đóng đơn (MVP, thay cho quét QR).
  @Patch(':id/complete')
  complete(@Param('id') id: string, @Query('receiverId') receiverId?: string) {
    return this.receiverService.confirmReceived(id, receiverId);
  }
}

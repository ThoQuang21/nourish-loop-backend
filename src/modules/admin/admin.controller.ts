import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { SetVerificationDto } from './dto/set-verification.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

/**
 * Routes: /api/admin/* — quản trị viên.
 * TODO: thêm AdminGuard (kiểm role ADMIN) — tạm thời mở để dễ test.
 */
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.adminService.dashboard();
  }

  // ----- Posts -----
  @Get('posts')
  listPosts(@Query('status') status?: string) {
    return this.adminService.listPosts(status);
  }

  @Patch('posts/:id/expire')
  expirePost(@Param('id') id: string) {
    return this.adminService.expirePost(id);
  }

  @Delete('posts/:id')
  deletePost(@Param('id') id: string) {
    return this.adminService.deletePost(id);
  }

  // ----- Requests -----
  @Get('requests')
  listRequests(@Query('status') status?: string) {
    return this.adminService.listRequests(status);
  }

  @Patch('requests/:id')
  updateRequest(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.adminService.updateRequestStatus(id, dto.status);
  }

  // ----- Stories -----
  @Get('stories')
  listStories(@Query('status') status?: string) {
    return this.adminService.listStories(status);
  }

  @Patch('stories/:id')
  updateStory(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.adminService.updateStoryStatus(id, dto.status);
  }

  // ----- Users -----
  @Get('users')
  listUsers(@Query('role') role?: string) {
    return this.adminService.listUsers(role === 'receiver' ? 'receiver' : 'provider');
  }

  @Patch('users/:id/verification')
  setVerification(@Param('id') id: string, @Body() dto: SetVerificationDto) {
    return this.adminService.setVerification(id, dto.verified);
  }

  // ----- Verifications -----
  @Get('verifications')
  listVerifications(@Query('status') status?: string) {
    return this.adminService.listVerifications(status);
  }

  @Patch('verifications/:id')
  updateVerification(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.adminService.updateVerificationStatus(id, dto.status);
  }
}

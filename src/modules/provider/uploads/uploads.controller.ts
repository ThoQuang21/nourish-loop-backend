import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUserId } from '../../../common/decorators/current-user-id.decorator';
import { UploadsService } from './uploads.service';

@Controller('provider/uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('post-image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadPostImage(
    @CurrentUserId() providerId: string,
    @UploadedFile() file?: {
      originalname: string;
      mimetype: string;
      buffer: Buffer;
      size: number;
    },
  ) {
    return this.uploadsService.uploadPostImage(providerId, file);
  }
}

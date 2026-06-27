import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { PrismaService } from '../../../prisma/prisma.service';

type UploadedFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};

@Injectable()
export class UploadsService {
  private readonly allowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async uploadPostImage(providerId: string, file?: UploadedFile) {
    await this.ensureProvider(providerId);

    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (!this.allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG, and WEBP images are supported');
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException('Image must be 5MB or smaller');
    }

    const supabaseUrl = this.config.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const bucket = this.config.get<string>('SUPABASE_STORAGE_BUCKET', 'post-images');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new InternalServerErrorException(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
      );
    }

    const extension = this.getFileExtension(file.originalname, file.mimetype);
    const objectPath = `provider/${providerId}/${Date.now()}-${randomUUID()}${extension}`;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': file.mimetype,
        'x-upsert': 'true',
      },
      body: new Uint8Array(file.buffer),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new InternalServerErrorException(
        `Supabase upload failed: ${errorText || response.statusText}`,
      );
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;

    return {
      bucket,
      path: objectPath,
      imageUrl: publicUrl,
      publicUrl,
    };
  }

  private getFileExtension(originalName: string, mimeType: string) {
    const existingExtension = extname(originalName);
    if (existingExtension) {
      return existingExtension.toLowerCase();
    }

    switch (mimeType) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      default:
        return '';
    }
  }

  private async ensureProvider(providerId: string) {
    const provider = await this.prisma.user.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!provider) {
      throw new NotFoundException(`Provider ${providerId} not found`);
    }

    if (provider.role !== 'PROVIDER') {
      throw new ForbiddenException('Current user is not a provider');
    }

    return provider;
  }
}

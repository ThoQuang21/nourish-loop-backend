import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateFoodPostDto } from './dto/create-food-post.dto';
import { QueryFoodPostDto } from './dto/query-food-post.dto';
import { UpdateFoodPostDto } from './dto/update-food-post.dto';

@Injectable()
export class FoodPostsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(providerId: string, query: QueryFoodPostDto) {
    await this.ensureProvider(providerId);

    const where: Prisma.FoodPostWhereInput = {
      providerId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.minKg ? { weightKg: { gte: query.minKg } } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    return this.prisma.foodPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            requests: true,
            transactions: true,
          },
        },
      },
    });
  }

  async findOne(providerId: string, id: string) {
    await this.ensureProvider(providerId);

    const post = await this.prisma.foodPost.findFirst({
      where: { id, providerId },
      include: {
        provider: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            profile: true,
          },
        },
        requests: {
          orderBy: { createdAt: 'desc' },
          include: {
            receiver: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                avatarUrl: true,
                profile: true,
              },
            },
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Provider post ${id} not found`);
    }

    return post;
  }

  async create(providerId: string, dto: CreateFoodPostDto) {
    await this.ensureProvider(providerId);

    const expiresAt = dto.expiresInHours
      ? new Date(Date.now() + dto.expiresInHours * 3600_000)
      : undefined;

    const post = await this.prisma.foodPost.create({
      data: {
        providerId,
        title: dto.title,
        category: dto.category,
        weightKg: dto.weightKg,
        description: dto.description,
        imageUrl: dto.imageUrl,
        address: dto.address,
        district: dto.district,
        pickupWindow: dto.pickupWindow,
        expiresAt,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: providerId,
        type: 'REMINDER',
        title: 'Post created',
        body: `Your post "${post.title}" is now open for requests.`,
      },
    });

    return post;
  }

  async update(providerId: string, id: string, dto: UpdateFoodPostDto) {
    await this.ensureProvider(providerId);

    const existing = await this.getOwnedPost(providerId, id);

    if (
      existing.status === PostStatus.COMPLETED ||
      existing.status === PostStatus.EXPIRED
    ) {
      throw new ConflictException('Completed or expired posts cannot be edited');
    }

    const expiresAt =
      dto.expiresInHours === undefined
        ? undefined
        : new Date(Date.now() + dto.expiresInHours * 3600_000);

    return this.prisma.foodPost.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.weightKg !== undefined ? { weightKg: dto.weightKg } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.district !== undefined ? { district: dto.district } : {}),
        ...(dto.pickupWindow !== undefined ? { pickupWindow: dto.pickupWindow } : {}),
        ...(expiresAt !== undefined ? { expiresAt } : {}),
      },
    });
  }

  async remove(providerId: string, id: string) {
    await this.ensureProvider(providerId);

    const existing = await this.getOwnedPost(providerId, id);

    if (existing.status === PostStatus.MATCHED) {
      throw new ConflictException('Matched posts cannot be closed');
    }

    if (existing.status === PostStatus.COMPLETED) {
      throw new ConflictException('Completed posts cannot be closed');
    }

    if (existing.status === PostStatus.EXPIRED) {
      return existing;
    }

    const [post] = await this.prisma.$transaction([
      this.prisma.foodPost.update({
        where: { id },
        data: {
          status: PostStatus.EXPIRED,
          expiresAt: existing.expiresAt ?? new Date(),
        },
      }),
      this.prisma.request.updateMany({
        where: {
          postId: id,
          status: 'PENDING',
        },
        data: {
          status: 'CANCELLED',
        },
      }),
    ]);

    return post;
  }

  private async ensureProvider(providerId: string) {
    const provider = await this.prisma.user.findUnique({
      where: { id: providerId },
      include: { profile: true },
    });

    if (!provider) {
      throw new NotFoundException(`Provider ${providerId} not found`);
    }

    if (provider.role !== UserRole.PROVIDER) {
      throw new ForbiddenException('Current user is not a provider');
    }

    return provider;
  }

  private async getOwnedPost(providerId: string, id: string) {
    const post = await this.prisma.foodPost.findFirst({
      where: { id, providerId },
    });

    if (!post) {
      throw new NotFoundException(`Provider post ${id} not found`);
    }

    return post;
  }
}

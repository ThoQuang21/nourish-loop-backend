import { Injectable, NotFoundException } from '@nestjs/common';
import { FoodPost, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFoodPostDto } from './dto/create-food-post.dto';
import { QueryFoodPostDto } from './dto/query-food-post.dto';

/**
 * Module MẪU — minh hoạ pattern: service inject PrismaService và truy vấn DB.
 * Một số nghiệp vụ (lọc theo khoảng cách, tính expiresAt chuẩn) còn để TODO.
 */
@Injectable()
export class FoodPostsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryFoodPostDto): Promise<FoodPost[]> {
    const where: Prisma.FoodPostWhereInput = {
      status: query.status ?? 'OPEN',
      ...(query.category ? { category: query.category } : {}),
      ...(query.minKg ? { weightKg: { gte: query.minKg } } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    // TODO: lọc theo maxDistanceKm cần toạ độ receiver + tính khoảng cách (PostGIS hoặc Haversine).
    return this.prisma.foodPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { provider: { select: { id: true, fullName: true, avatarUrl: true } } },
    });
  }

  async findOne(id: string): Promise<FoodPost> {
    const post = await this.prisma.foodPost.findUnique({
      where: { id },
      include: { provider: { include: { profile: true } } },
    });
    if (!post) {
      throw new NotFoundException(`Không tìm thấy tin đăng ${id}`);
    }
    return post;
  }

  async create(providerId: string, dto: CreateFoodPostDto): Promise<FoodPost> {
    const expiresAt = dto.expiresInHours
      ? new Date(Date.now() + dto.expiresInHours * 3600_000)
      : undefined;

    return this.prisma.foodPost.create({
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
  }
}

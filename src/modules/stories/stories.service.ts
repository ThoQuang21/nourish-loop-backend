import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StoryStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStoryDto } from './dto/create-story.dto';

type StoryWithRelations = {
  id: string;
  text: string;
  imageUrl: string | null;
  likes: number;
  status: StoryStatus;
  createdAt: Date;
  author: { fullName: string; avatarUrl: string | null; profile?: { org: string | null } | null };
  thanksToProvider?:
    | { fullName: string; profile?: { org: string | null } | null }
    | null;
};

function mapStory(s: StoryWithRelations) {
  return {
    id: s.id,
    author: s.author.fullName,
    org: s.author.profile?.org ?? '',
    avatar: s.author.avatarUrl ?? '',
    image: s.imageUrl ?? '',
    text: s.text,
    thanksTo: s.thanksToProvider?.profile?.org ?? s.thanksToProvider?.fullName ?? '',
    daysAgo: Math.floor((Date.now() - s.createdAt.getTime()) / 86_400_000),
    likes: s.likes,
    status: s.status.toLowerCase(),
  };
}

const STORY_INCLUDE = {
  author: { select: { fullName: true, avatarUrl: true, profile: { select: { org: true } } } },
  thanksToProvider: { select: { fullName: true, profile: { select: { org: true } } } },
};

@Injectable()
export class StoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Feed câu chuyện (mặc định chỉ PUBLISHED). */
  async list(status?: string) {
    const norm = this.normalizeStatus(status) ?? 'PUBLISHED';
    const stories = await this.prisma.story.findMany({
      where: { status: norm },
      orderBy: { createdAt: 'desc' },
      include: STORY_INCLUDE,
    });
    return stories.map((s) => mapStory(s as StoryWithRelations));
  }

  /** Đăng câu chuyện mới (authorId tạm lấy từ body — sẽ chuyển sang token). */
  async create(dto: CreateStoryDto) {
    try {
      const story = await this.prisma.story.create({
        data: {
          authorId: dto.authorId,
          text: dto.text,
          imageUrl: dto.imageUrl,
          thanksToProviderId: dto.thanksToProviderId,
        },
        include: STORY_INCLUDE,
      });
      return mapStory(story as StoryWithRelations);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new BadRequestException('authorId hoặc thanksToProviderId không hợp lệ');
      }
      throw e;
    }
  }

  /** Thích một câu chuyện (+1). */
  async like(id: string) {
    const exists = await this.prisma.story.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException(`Không tìm thấy câu chuyện ${id}`);
    const s = await this.prisma.story.update({
      where: { id },
      data: { likes: { increment: 1 } },
      select: { id: true, likes: true },
    });
    return s;
  }

  private normalizeStatus(value?: string): StoryStatus | undefined {
    if (!value) return undefined;
    const up = value.toUpperCase();
    return (['PENDING', 'PUBLISHED', 'HIDDEN'] as const).includes(up as StoryStatus)
      ? (up as StoryStatus)
      : undefined;
  }
}

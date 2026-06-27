import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { mapRequestToFrontend } from '../provider-contract';
import { QueryIncomingRequestsDto } from './dto/query-incoming-requests.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findIncoming(providerId: string, query: QueryIncomingRequestsDto) {
    await this.ensureProvider(providerId);

    const requests = await this.prisma.request.findMany({
      where: {
        post: {
          providerId,
        },
        ...(query.postId ? { postId: query.postId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            status: true,
            category: true,
            weightKg: true,
            pickupWindow: true,
            expiresAt: true,
          },
        },
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
        transaction: {
          select: {
            id: true,
            qrCode: true,
          },
        },
      },
    });

    return requests.map(mapRequestToFrontend);
  }

  async updateStatus(providerId: string, requestId: string, dto: UpdateRequestStatusDto) {
    await this.ensureProvider(providerId);

    if (!['ACCEPTED', 'REJECTED'].includes(dto.status)) {
      throw new BadRequestException('Provider can only set ACCEPTED or REJECTED');
    }

    const request = await this.prisma.request.findFirst({
      where: {
        id: requestId,
        post: {
          providerId,
        },
      },
      include: {
        post: true,
        receiver: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }

    if (dto.status === 'ACCEPTED') {
      return this.acceptRequest(providerId, request);
    }

    return this.rejectRequest(providerId, request.id, request.receiver.id, request.post.title);
  }

  private async acceptRequest(
    providerId: string,
    request: {
      id: string;
      receiver: { id: string; fullName: string };
      post: { id: string; title: string; status: string; weightKg: number };
      receiverId: string;
      status: string;
    },
  ) {
    if (request.status !== 'PENDING') {
      throw new ConflictException('Only pending requests can be accepted');
    }

    if (request.post.status !== 'OPEN') {
      throw new ConflictException('Only open posts can accept requests');
    }

    const otherPendingRequests = await this.prisma.request.findMany({
      where: {
        postId: request.post.id,
        status: 'PENDING',
        id: { not: request.id },
      },
      select: {
        id: true,
        receiverId: true,
      },
    });

    return this.prisma.$transaction(async (tx) => {
      const acceptedRequest = await tx.request.update({
        where: { id: request.id },
        data: { status: 'ACCEPTED' },
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
      });

      await tx.foodPost.update({
        where: { id: request.post.id },
        data: { status: 'MATCHED' },
      });

      if (otherPendingRequests.length > 0) {
        await tx.request.updateMany({
          where: {
            id: { in: otherPendingRequests.map((item) => item.id) },
          },
          data: {
            status: 'REJECTED',
          },
        });
      }

      const transaction = await tx.transaction.create({
        data: {
          postId: request.post.id,
          requestId: request.id,
          providerId,
          receiverId: request.receiverId,
          qrCode: crypto.randomUUID(),
          weightKg: request.post.weightKg,
          co2SavedKg: request.post.weightKg * 2.5,
        },
      });

      const notifications: Array<{
        userId: string;
        type: 'REQUEST' | 'ACCEPTED';
        title: string;
        body: string;
      }> = [
        {
          userId: request.receiverId,
          type: 'ACCEPTED',
          title: 'Request accepted',
          body: `Your request for "${request.post.title}" was accepted.`,
        },
      ];

      notifications.push(
        ...otherPendingRequests.map((item) => ({
          userId: item.receiverId,
          type: 'REQUEST' as const,
          title: 'Request closed',
          body: `Another receiver was selected for "${request.post.title}".`,
        })),
      );

      await tx.notification.createMany({
        data: notifications,
      });

      return {
        request: mapRequestToFrontend({
          ...acceptedRequest,
          postId: request.post.id,
          distanceKm: null,
          createdAt: new Date(),
          transaction: {
            id: transaction.id,
            qrCode: transaction.qrCode,
          },
        }),
        transaction: {
          id: transaction.id,
          qrCode: transaction.qrCode,
        },
      };
    });
  }

  private async rejectRequest(
    providerId: string,
    requestId: string,
    receiverId: string,
    postTitle: string,
  ) {
    const request = await this.prisma.request.findFirst({
      where: {
        id: requestId,
        post: {
          providerId,
        },
      },
      select: {
        id: true,
        status: true,
        postId: true,
        receiver: {
          select: {
            id: true,
            fullName: true,
            profile: true,
          },
        },
        distanceKm: true,
        createdAt: true,
      },
    });

    if (!request) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }

    if (request.status !== 'PENDING') {
      throw new ConflictException('Only pending requests can be rejected');
    }

    const [updatedRequest] = await this.prisma.$transaction([
      this.prisma.request.update({
        where: { id: requestId },
        data: { status: 'REJECTED' },
        include: {
          receiver: {
            select: {
              id: true,
              fullName: true,
              profile: true,
            },
          },
        },
      }),
      this.prisma.notification.create({
        data: {
          userId: receiverId,
          type: 'REQUEST',
          title: 'Request rejected',
          body: `Your request for "${postTitle}" was rejected.`,
        },
      }),
    ]);

    return mapRequestToFrontend({
      ...updatedRequest,
      transaction: null,
    });
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

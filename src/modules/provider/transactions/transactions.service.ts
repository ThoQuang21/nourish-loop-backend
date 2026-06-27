import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfirmTransactionDto } from './dto/confirm-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async confirm(providerId: string, transactionId: string, dto: ConfirmTransactionDto) {
    await this.ensureProvider(providerId);

    const existing = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        providerId,
      },
      include: {
        post: true,
        request: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    if (existing.qrCode !== dto.qrCode) {
      throw new ConflictException('QR code does not match this transaction');
    }

    if (existing.completedAt) {
      return existing;
    }

    return this.prisma.$transaction(async (tx) => {
      const confirmed = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          confirmedByProvider: true,
        },
        include: {
          post: true,
          request: true,
        },
      });

      if (!confirmed.confirmedByReceiver) {
        return confirmed;
      }

      const weightKg = confirmed.weightKg ?? confirmed.post.weightKg;
      const co2SavedKg = confirmed.co2SavedKg ?? weightKg * 2.5;
      const completedAt = new Date();

      const completedTransaction = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          completedAt,
          weightKg,
          co2SavedKg,
        },
      });

      await tx.request.update({
        where: { id: confirmed.requestId },
        data: { status: 'COMPLETED' },
      });

      await tx.foodPost.update({
        where: { id: confirmed.postId },
        data: { status: 'COMPLETED' },
      });

      await tx.profile.upsert({
        where: { userId: providerId },
        update: {
          totalKg: { increment: weightKg },
          totalDeals: { increment: 1 },
        },
        create: {
          userId: providerId,
          totalKg: weightKg,
          totalDeals: 1,
        },
      });

      await tx.profile.upsert({
        where: { userId: confirmed.receiverId },
        update: {
          totalKg: { increment: weightKg },
          totalDeals: { increment: 1 },
        },
        create: {
          userId: confirmed.receiverId,
          totalKg: weightKg,
          totalDeals: 1,
        },
      });

      await tx.notification.createMany({
        data: [
          {
            userId: providerId,
            type: 'ACCEPTED',
            title: 'Transaction completed',
            body: `You completed handover for "${confirmed.post.title}".`,
          },
          {
            userId: confirmed.receiverId,
            type: 'ACCEPTED',
            title: 'Transaction completed',
            body: `Pickup for "${confirmed.post.title}" is complete.`,
          },
        ],
      });

      return completedTransaction;
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

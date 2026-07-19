import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DigestDto, LinkSummary } from '@repo/shared';
import { DigestStatus } from '../../generated/prisma/enums';

@Injectable()
export class DigestService {
  constructor(private prisma: PrismaService) {}

  async findToday(userId: string): Promise<DigestDto | null> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const digest = await this.prisma.digest.findFirst({
      where: {
        userId,
        digestDate: today,
      },
    });

    if (!digest) return null;
    return this.toDto(digest);
  }

  async findMany(params: {
    userId: string;
    skip: number;
    take: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ items: DigestDto[]; total: number }> {
    const where: any = { userId: params.userId };

    if (params.startDate || params.endDate) {
      where.digestDate = {};
      if (params.startDate) where.digestDate.gte = params.startDate;
      if (params.endDate) where.digestDate.lte = params.endDate;
    }

    const [digests, total] = await Promise.all([
      this.prisma.digest.findMany({
        where,
        orderBy: { digestDate: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.digest.count({ where }),
    ]);

    return {
      items: digests.map((d: any) => this.toDto(d)),
      total,
    };
  }

  async findById(userId: string, id: string): Promise<DigestDto | null> {
    const digest = await this.prisma.digest.findFirst({
      where: { id, userId },
    });

    if (!digest) return null;
    return this.toDto(digest);
  }

  async upsertForUser(
    userId: string,
    digestDate: Date,
    patch: {
      status: DigestStatus;
      summaryMarkdown?: string;
      linksProcessed?: LinkSummary[];
    },
  ): Promise<DigestDto> {
    const digest = await this.prisma.digest.upsert({
      where: {
        unique_user_digest_date: {
          userId,
          digestDate,
        },
      },
      update: {
        status: patch.status,
        summaryMarkdown: patch.summaryMarkdown,
        linksProcessed: patch.linksProcessed,
        updatedAt: new Date(),
      },
      create: {
        userId,
        digestDate,
        status: patch.status,
        summaryMarkdown: patch.summaryMarkdown || '',
        linksProcessed: patch.linksProcessed || [],
      },
    });

    return this.toDto(digest);
  }

  private toDto(digest: any): DigestDto {
    return {
      id: digest.id,
      userId: digest.userId,
      digestDate: digest.digestDate,
      summaryMarkdown: digest.summaryMarkdown,
      linksProcessed: Array.isArray(digest.linksProcessed)
        ? digest.linksProcessed
        : [],
      status: digest.status as
        'processing' | 'completed' | 'failed' | 'no_emails',
      createdAt: digest.createdAt,
      updatedAt: digest.updatedAt,
    };
  }
}

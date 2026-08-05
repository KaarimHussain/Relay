import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from '../analytics.service';
import { PostStatus } from '@prisma/client';

export const ANALYTICS_QUEUE = 'analytics';

@Processor(ANALYTICS_QUEUE)
export class AnalyticsProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(private prisma: PrismaService, private analytics: AnalyticsService) {
    super();
  }

  async process(job: Job) {
    if (job.name === 'collect') {
      await this.collectAll();
    }
  }

  private async collectAll() {
    const targets = await this.prisma.postPlatformTarget.findMany({
      where: { status: PostStatus.Published, externalPostId: { not: null } },
      include: { account: true },
    });

    this.logger.log(`Collecting analytics for ${targets.length} published targets`);

    for (const target of targets) {
      try {
        // TODO: Call real platform analytics APIs with decrypted target.account.accessToken
        // Simulate random metric increment for now
        const mock = {
          reach:       Math.floor(Math.random() * 500),
          impressions: Math.floor(Math.random() * 1000),
          likes:       Math.floor(Math.random() * 200),
          comments:    Math.floor(Math.random() * 50),
          shares:      Math.floor(Math.random() * 30),
          saves:       Math.floor(Math.random() * 40),
          clicks:      Math.floor(Math.random() * 100),
        };
        await this.analytics.recordSnapshot(target.id, mock);
      } catch (err: any) {
        this.logger.error(`Analytics collection failed for target ${target.id}: ${err.message}`);
      }
    }
  }
}

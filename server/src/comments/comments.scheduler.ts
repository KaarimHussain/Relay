import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CommentsService } from './comments.service';

@Injectable()
export class CommentsScheduler {
  private readonly logger = new Logger(CommentsScheduler.name);

  constructor(
    private prisma: PrismaService,
    private comments: CommentsService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncAll() {
    const brands = await this.prisma.brand.findMany({ select: { id: true } });
    this.logger.log(`Auto-syncing comments for ${brands.length} brands`);
    for (const brand of brands) {
      try {
        const result = await this.comments.syncComments(brand.id);
        if (result.synced > 0) {
          this.logger.debug(`Brand ${brand.id}: synced ${result.synced} comments`);
        }
      } catch (err: any) {
        this.logger.warn(`Comment sync failed for brand ${brand.id}: ${err.message}`);
      }
    }
  }
}

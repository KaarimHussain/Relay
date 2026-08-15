import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CommentsService } from './comments.service';

@Injectable()
export class CommentsScheduler {
  private readonly logger = new Logger(CommentsScheduler.name);

  private running = false;

  constructor(
    private prisma: PrismaService,
    private comments: CommentsService,
  ) {}

  @Cron('*/30 * * * * *') // every 30 seconds
  async syncAll() {
    // Guard against overlap — a sweep slower than 30s must not stack up.
    if (this.running) return;
    this.running = true;
    try {
      const brands = await this.prisma.brand.findMany({ select: { id: true } });
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
    } finally {
      this.running = false;
    }
  }
}

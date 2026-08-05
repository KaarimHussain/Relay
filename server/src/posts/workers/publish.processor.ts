import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountsService } from '../../accounts/accounts.service';
import { PostStatus } from '@prisma/client';
import { publishToPlatform } from './platform-publisher';

export const PUBLISH_QUEUE = 'publish';

export interface PublishJobData {
  targetId: string;
  postId: string;
  accountId: string;
}

@Processor(PUBLISH_QUEUE)
export class PublishProcessor extends WorkerHost {
  private readonly logger = new Logger(PublishProcessor.name);

  constructor(
    private prisma: PrismaService,
    private accounts: AccountsService,
  ) {
    super();
  }

  async process(job: Job<PublishJobData>) {
    const { targetId, accountId } = job.data;
    const target = await this.prisma.postPlatformTarget.findUnique({ where: { id: targetId } });
    if (!target) { this.logger.warn(`Target ${targetId} not found — skipping`); return; }

    // Idempotency check
    if (target.status === PostStatus.Published) {
      this.logger.log(`Target ${targetId} already published — skipping`);
      return;
    }

    await this.prisma.postPlatformTarget.update({
      where: { id: targetId },
      data: { status: PostStatus.Publishing },
    });

    try {
      const account = await this.accounts.getDecryptedAccount(accountId);
      const externalPostId = await publishToPlatform(
        account.platform,
        account.platformUserId,
        account.accessToken,
        target.caption,
        target.hashtags,
      );

      await this.prisma.postPlatformTarget.update({
        where: { id: targetId },
        data: { status: PostStatus.Published, publishedAt: new Date(), externalPostId },
      });

      // Update parent post status if all targets are published
      const siblings = await this.prisma.postPlatformTarget.findMany({ where: { postId: target.postId } });
      const allDone = siblings.every(s => s.id === targetId || s.status === PostStatus.Published);
      if (allDone) {
        await this.prisma.post.update({ where: { id: target.postId }, data: { status: PostStatus.Published } });
      }

      this.logger.log(`Published target ${targetId} → externalId: ${externalPostId}`);
    } catch (err: any) {
      const errorMessage = err?.message ?? 'Unknown error';
      this.logger.error(`Failed to publish target ${targetId}: ${errorMessage}`);
      await this.prisma.postPlatformTarget.update({
        where: { id: targetId },
        data: { status: PostStatus.Failed, errorMessage },
      });
      throw err; // Let BullMQ handle retries
    }
  }
}

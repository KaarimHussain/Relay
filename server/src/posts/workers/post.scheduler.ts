import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PostsService } from '../posts.service';

@Injectable()
export class PostScheduler {
  private readonly logger = new Logger(PostScheduler.name);

  constructor(private postsService: PostsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledPosts() {
    try {
      await this.postsService.publishDueScheduledPosts();
    } catch (err: any) {
      this.logger.error(`Scheduled publish sweep failed: ${err?.message}`);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsService } from '../analytics.service';

@Injectable()
export class AnalyticsScheduler {
  private readonly logger = new Logger(AnalyticsScheduler.name);

  constructor(private analytics: AnalyticsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async collectAnalytics() {
    try {
      await this.analytics.collectAllPublished();
    } catch (err: any) {
      this.logger.error(`Analytics collection sweep failed: ${err?.message}`);
    }
  }
}

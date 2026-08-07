import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsScheduler } from './workers/analytics.scheduler';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [AccountsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsScheduler],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

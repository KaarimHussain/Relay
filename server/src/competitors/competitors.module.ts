import { Module } from '@nestjs/common';
import { CompetitorsService } from './competitors.service';
import { CompetitorsController } from './competitors.controller';
import { CompetitorDataProvider } from './competitor-data.provider';

@Module({
  controllers: [CompetitorsController],
  providers: [CompetitorsService, CompetitorDataProvider],
  exports: [CompetitorsService],
})
export class CompetitorsModule {}

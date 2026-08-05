import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BrandMemberGuard } from '../common/guards/brand-member.guard';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BrandMemberGuard)
@Controller('brands/:brandId/analytics')
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Get('overview')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  overview(@Param('brandId') brandId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.overview(brandId, from, to);
  }

  @Get('posts/:postId')
  postBreakdown(@Param('brandId') brandId: string, @Param('postId') postId: string) {
    return this.analytics.postBreakdown(brandId, postId);
  }
}

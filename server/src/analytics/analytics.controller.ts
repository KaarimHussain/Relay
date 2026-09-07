import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Platform } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BrandMemberGuard } from '../common/guards/brand-member.guard';

/** Accept a raw `platform` query value only if it is a known Platform enum member. */
function parsePlatform(value?: string): Platform | undefined {
  if (!value || value === 'all') return undefined;
  return (Object.values(Platform) as string[]).includes(value) ? (value as Platform) : undefined;
}

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BrandMemberGuard)
@Controller('brands/:brandId/analytics')
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Get('overview')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'platform', required: false, enum: Platform })
  overview(
    @Param('brandId') brandId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('platform') platform?: string,
  ) {
    return this.analytics.overview(brandId, from, to, parsePlatform(platform));
  }

  @Get('time-series')
  @ApiQuery({ name: 'metric', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'platform', required: false, enum: Platform })
  timeSeries(
    @Param('brandId') brandId: string,
    @Query('metric') metric = 'reach',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('platform') platform?: string,
  ) {
    return this.analytics.timeSeries(brandId, metric, from, to, parsePlatform(platform));
  }

  @Get('posts/:postId')
  postBreakdown(@Param('brandId') brandId: string, @Param('postId') postId: string) {
    return this.analytics.postBreakdown(brandId, postId);
  }

  @Post('collect')
  collect(@Param('brandId') brandId: string) {
    return this.analytics.collectForBrand(brandId);
  }
}

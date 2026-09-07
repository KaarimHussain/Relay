import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TrendsService } from './trends.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BrandMemberGuard } from '../common/guards/brand-member.guard';

@ApiTags('Trends')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BrandMemberGuard)
@Controller('brands/:brandId/trends')
export class TrendsController {
  constructor(private trends: TrendsService) {}

  @Get('hashtags')
  @ApiQuery({ name: 'platform', required: false })
  getHashtags(
    @Param('brandId') brandId: string,
    @Query('platform') platform?: string,
  ) {
    return this.trends.getHashtags(brandId, platform);
  }

  @Post('refresh')
  refresh(@Param('brandId') brandId: string) {
    return this.trends.refreshForBrand(brandId);
  }
}

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LinkedInService } from './linkedin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BrandMemberGuard } from '../common/guards/brand-member.guard';

@ApiTags('LinkedIn')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BrandMemberGuard)
@Controller('brands/:brandId/linkedin')
export class LinkedInController {
  constructor(private svc: LinkedInService) {}

  @Get('ad-library')
  @ApiQuery({ name: 'query', required: true })
  @ApiQuery({ name: 'start',  required: false })
  @ApiQuery({ name: 'count',  required: false })
  searchAdLibrary(
    @Param('brandId') brandId: string,
    @Query('query') query: string,
    @Query('start')  start?: string,
    @Query('count')  count?: string,
  ) {
    return this.svc.searchAdLibrary(brandId, query ?? '', Number(start ?? 0), Number(count ?? 12));
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Platform, MemberRole } from '@prisma/client';
import { CompetitorsService } from './competitors.service';
import { CreateCompetitorDto } from './dto/create-competitor.dto';
import { UpdateCompetitorDto } from './dto/update-competitor.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BrandMemberGuard } from '../common/guards/brand-member.guard';
import { Roles } from '../common/decorators/roles.decorator';

function parsePlatform(value?: string): Platform | undefined {
  if (!value) return undefined;
  return (Object.values(Platform) as string[]).includes(value) ? (value as Platform) : undefined;
}

@ApiTags('Competitors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BrandMemberGuard)
@Controller('brands/:brandId/competitors')
export class CompetitorsController {
  constructor(private competitors: CompetitorsService) {}

  @Get()
  list(@Param('brandId') brandId: string) {
    return this.competitors.list(brandId);
  }

  @Get('compare')
  @ApiQuery({ name: 'platform', required: false, enum: Platform })
  compare(@Param('brandId') brandId: string, @Query('platform') platform?: string) {
    return this.competitors.compare(brandId, parsePlatform(platform));
  }

  @Post()
  @Roles(MemberRole.Admin, MemberRole.Owner, MemberRole.Editor)
  create(@Param('brandId') brandId: string, @Body() dto: CreateCompetitorDto) {
    return this.competitors.create(brandId, dto);
  }

  @Patch(':id')
  @Roles(MemberRole.Admin, MemberRole.Owner, MemberRole.Editor)
  update(@Param('brandId') brandId: string, @Param('id') id: string, @Body() dto: UpdateCompetitorDto) {
    return this.competitors.update(brandId, id, dto);
  }

  @Post(':id/sync')
  @Roles(MemberRole.Admin, MemberRole.Owner, MemberRole.Editor)
  sync(@Param('brandId') brandId: string, @Param('id') id: string) {
    return this.competitors.sync(brandId, id);
  }

  @Delete(':id')
  @Roles(MemberRole.Admin, MemberRole.Owner, MemberRole.Editor)
  remove(@Param('brandId') brandId: string, @Param('id') id: string) {
    return this.competitors.remove(brandId, id);
  }
}

import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BrandMemberGuard } from '../common/guards/brand-member.guard';

@ApiTags('Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BrandMemberGuard)
@Controller('brands/:brandId/templates')
export class TemplatesController {
  constructor(private templates: TemplatesService) {}

  @Get()
  list(@Param('brandId') brandId: string) {
    return this.templates.list(brandId);
  }

  @Post()
  create(@Param('brandId') brandId: string, @Body() dto: CreateTemplateDto) {
    return this.templates.create(brandId, dto);
  }

  @Patch(':id')
  update(@Param('brandId') brandId: string, @Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templates.update(brandId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('brandId') brandId: string, @Param('id') id: string) {
    return this.templates.remove(brandId, id);
  }
}

import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { GenerateCaptionDto } from './dto/generate-caption.dto';
import { GenerateIdeasDto } from './dto/generate-ideas.dto';
import { GenerateHashtagsDto } from './dto/generate-hashtags.dto';
import { ImproveCaptionDto } from './dto/improve-caption.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BrandMemberGuard } from '../common/guards/brand-member.guard';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BrandMemberGuard)
@Controller('brands/:brandId/ai')
export class AiController {
  constructor(private ai: AiService) {}

  @Post('generate-caption')
  generateCaption(@Param('brandId') brandId: string, @Body() dto: GenerateCaptionDto) {
    return this.ai.generateCaption(brandId, dto);
  }

  @Post('generate-ideas')
  generateIdeas(@Param('brandId') brandId: string, @Body() dto: GenerateIdeasDto) {
    return this.ai.generateIdeas(brandId, dto);
  }

  @Post('generate-hashtags')
  generateHashtags(@Param('brandId') brandId: string, @Body() dto: GenerateHashtagsDto) {
    return this.ai.generateHashtags(brandId, dto);
  }

  @Post('improve-caption')
  improveCaption(@Param('brandId') brandId: string, @Body() dto: ImproveCaptionDto) {
    return this.ai.improveCaption(brandId, dto);
  }
}

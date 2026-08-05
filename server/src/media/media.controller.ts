import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { UploadUrlDto } from './dto/upload-url.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BrandMemberGuard } from '../common/guards/brand-member.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BrandMemberGuard)
@Controller('brands/:brandId/media')
export class MediaController {
  constructor(private media: MediaService) {}

  @Post('upload-url')
  getUploadUrl(@Param('brandId') brandId: string, @CurrentUser() user: any, @Body() dto: UploadUrlDto) {
    return this.media.getUploadUrl(brandId, user.id, dto);
  }

  @Get()
  @ApiQuery({ name: 'postId', required: false })
  list(@Param('brandId') brandId: string, @Query('postId') postId?: string) {
    return this.media.list(brandId, postId);
  }

  @Delete(':mediaId')
  delete(@Param('brandId') brandId: string, @Param('mediaId') mediaId: string) {
    return this.media.delete(brandId, mediaId);
  }
}

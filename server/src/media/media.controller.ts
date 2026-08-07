import {
  Controller, Delete, Get, Param, Post, Query,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BrandMemberGuard } from '../common/guards/brand-member.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BrandMemberGuard)
@Controller('brands/:brandId/media')
export class MediaController {
  constructor(private media: MediaService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }))
  upload(
    @Param('brandId') brandId: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Query('postId') postId?: string,
  ) {
    return this.media.saveUpload(brandId, user.id, file, postId);
  }

  @Get()
  @ApiQuery({ name: 'postId', required: false })
  list(@Param('brandId') brandId: string, @Query('postId') postId?: string) {
    return this.media.list(brandId, postId);
  }

  @Get(':mediaId')
  findOne(@Param('brandId') brandId: string, @Param('mediaId') mediaId: string) {
    return this.media.findOne(brandId, mediaId);
  }

  @Delete(':mediaId')
  delete(@Param('brandId') brandId: string, @Param('mediaId') mediaId: string) {
    return this.media.delete(brandId, mediaId);
  }
}

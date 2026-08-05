import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { SchedulePostDto } from './dto/schedule-post.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BrandMemberGuard } from '../common/guards/brand-member.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { PostStatus } from '@prisma/client';

@ApiTags('Posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BrandMemberGuard)
@Controller('brands/:brandId/posts')
export class PostsController {
  constructor(private posts: PostsService) {}

  @Post() create(@Param('brandId') brandId: string, @CurrentUser() user: any, @Body() dto: CreatePostDto) {
    return this.posts.create(brandId, user.id, dto);
  }

  @Get()
  @ApiQuery({ name: 'status', enum: PostStatus, required: false })
  list(@Param('brandId') brandId: string, @Query('status') status?: PostStatus) {
    return this.posts.list(brandId, status);
  }

  @Get(':postId') findOne(@Param('brandId') brandId: string, @Param('postId') postId: string) {
    return this.posts.findOne(brandId, postId);
  }

  @Patch(':postId') update(@Param('brandId') brandId: string, @Param('postId') postId: string, @Body() dto: UpdatePostDto) {
    return this.posts.update(brandId, postId, dto);
  }

  @Delete(':postId') delete(@Param('brandId') brandId: string, @Param('postId') postId: string) {
    return this.posts.delete(brandId, postId);
  }

  @Post(':postId/schedule') schedule(@Param('brandId') brandId: string, @Param('postId') postId: string, @Body() dto: SchedulePostDto) {
    return this.posts.schedule(brandId, postId, dto);
  }

  @Post(':postId/publish-now') publishNow(@Param('brandId') brandId: string, @Param('postId') postId: string) {
    return this.posts.publishNow(brandId, postId);
  }

  @Post(':postId/cancel') cancel(@Param('brandId') brandId: string, @Param('postId') postId: string) {
    return this.posts.cancel(brandId, postId);
  }
}

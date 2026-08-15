import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BrandMemberGuard } from '../common/guards/brand-member.guard';
import { CommentsService } from './comments.service';
import { CreateAutoReplyDto } from './dto/create-auto-reply.dto';
import { ReplyCommentDto } from './dto/reply-comment.dto';
import { UpdateCommentAiConfigDto } from './dto/update-comment-ai-config.dto';

@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, BrandMemberGuard)
@Controller('brands/:brandId/comments')
export class CommentsController {
  constructor(private comments: CommentsService) {}

  @Get()
  list(
    @Param('brandId') brandId: string,
    @Query('platform') platform?: string,
    @Query('targetId') targetId?: string,
    @Query('postId') postId?: string,
  ) {
    return this.comments.listComments(brandId, platform, targetId, postId);
  }

  @Post('sync')
  sync(@Param('brandId') brandId: string) {
    return this.comments.syncComments(brandId);
  }

  @Get(':commentId/replies')
  replies(@Param('brandId') brandId: string, @Param('commentId') commentId: string) {
    return this.comments.getReplies(brandId, commentId);
  }

  @Post(':commentId/reply')
  reply(
    @Param('brandId') brandId: string,
    @Param('commentId') commentId: string,
    @Body() dto: ReplyCommentDto,
  ) {
    return this.comments.replyToComment(brandId, commentId, dto.text);
  }

  @Get('ai-config')
  getAiConfig(@Param('brandId') brandId: string) {
    return this.comments.getAiConfig(brandId);
  }

  @Put('ai-config')
  updateAiConfig(@Param('brandId') brandId: string, @Body() dto: UpdateCommentAiConfigDto) {
    return this.comments.updateAiConfig(brandId, dto);
  }

  @Get('auto-replies')
  listRules(@Param('brandId') brandId: string) {
    return this.comments.listAutoReplies(brandId);
  }

  @Post('auto-replies')
  upsertRule(@Param('brandId') brandId: string, @Body() dto: CreateAutoReplyDto) {
    return this.comments.upsertAutoReply(brandId, dto);
  }

  @Patch('auto-replies/:ruleId/toggle')
  toggle(
    @Param('brandId') brandId: string,
    @Param('ruleId') ruleId: string,
    @Body() body: { isEnabled: boolean },
  ) {
    return this.comments.toggleAutoReply(brandId, ruleId, body.isEnabled);
  }

  @Delete('auto-replies/:ruleId')
  deleteRule(@Param('brandId') brandId: string, @Param('ruleId') ruleId: string) {
    return this.comments.deleteAutoReply(brandId, ruleId);
  }
}

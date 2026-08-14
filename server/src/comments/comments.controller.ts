import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BrandMemberGuard } from '../common/guards/brand-member.guard';
import { CommentsService } from './comments.service';
import { CreateAutoReplyDto } from './dto/create-auto-reply.dto';
import { ReplyCommentDto } from './dto/reply-comment.dto';

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

  @Post(':commentId/reply')
  reply(
    @Param('brandId') brandId: string,
    @Param('commentId') commentId: string,
    @Body() dto: ReplyCommentDto,
  ) {
    return this.comments.replyToComment(brandId, commentId, dto.text);
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

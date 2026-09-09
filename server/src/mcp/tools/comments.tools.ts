import { z } from 'zod';
import { CommentsService } from '../../comments/comments.service';
import { OwnershipService } from '../ownership.service';
import { AgentTool } from '../tool.types';

type Ctx = { userId: string };

export function buildCommentTools(
  ctx: Ctx,
  comments: CommentsService,
  ownership: OwnershipService,
): AgentTool[] {
  return [
    {
      name: 'list_comments',
      description:
        'List comments on published posts for a brand. Optionally filter by platform, postId, or targetId.',
      inputShape: {
        brandId: z.string(),
        platform: z.string().optional(),
        postId: z.string().optional(),
        targetId: z.string().optional(),
      },
      handler: async ({ brandId, platform, postId, targetId }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return comments.listComments(brandId, platform, targetId, postId);
      },
    },
    {
      name: 'get_comment_replies',
      description: 'Fetch all replies to a specific top-level comment.',
      inputShape: { brandId: z.string(), commentId: z.string() },
      handler: async ({ brandId, commentId }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return comments.getReplies(brandId, commentId);
      },
    },
    {
      name: 'reply_to_comment',
      description:
        'Post a reply to a comment on the connected social platform. The reply text will be published as the brand.',
      inputShape: {
        brandId: z.string(),
        commentId: z.string(),
        text: z.string().min(1),
      },
      handler: async ({ brandId, commentId, text }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return comments.replyToComment(brandId, commentId, text);
      },
    },
    {
      name: 'sync_comments',
      description:
        'Force an immediate sync of new comments from all connected social platforms for a brand. Normally runs automatically every 30 seconds.',
      inputShape: { brandId: z.string() },
      handler: async ({ brandId }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return comments.syncComments(brandId);
      },
    },
    {
      name: 'list_autoreply_rules',
      description: 'List auto-reply rules configured for a brand.',
      inputShape: { brandId: z.string() },
      handler: async ({ brandId }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return comments.listAutoReplies(brandId);
      },
    },
    {
      name: 'upsert_autoreply_rule',
      description:
        'Create or update an auto-reply rule for a platform. Fires on new top-level comments only.',
      inputShape: {
        brandId: z.string(),
        platform: z.string(),
        templateId: z.string(),
        isEnabled: z.boolean().optional(),
      },
      handler: async ({ brandId, ...rest }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return comments.upsertAutoReply(brandId, rest as any);
      },
    },
    {
      name: 'toggle_autoreply_rule',
      description: 'Enable or disable an existing auto-reply rule.',
      inputShape: { brandId: z.string(), ruleId: z.string(), isEnabled: z.boolean() },
      handler: async ({ brandId, ruleId, isEnabled }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return comments.toggleAutoReply(brandId, ruleId, isEnabled);
      },
    },
  ];
}

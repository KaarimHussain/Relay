import { z } from 'zod';
import { AiService } from '../../ai/ai.service';
import { CommentsService } from '../../comments/comments.service';
import { OwnershipService } from '../ownership.service';
import { AgentTool } from '../tool.types';

type Ctx = { userId: string };

export function buildAiTools(
  ctx: Ctx,
  ai: AiService,
  comments: CommentsService,
  ownership: OwnershipService,
): AgentTool[] {
  return [
    {
      name: 'generate_post_caption',
      description:
        'Generate one or more caption variations for a post in the brand voice. platform is REQUIRED.',
      inputShape: {
        brandId: z.string(),
        platform: z
          .enum(['Facebook', 'Instagram', 'LinkedIn', 'X', 'TikTok'])
          .describe('Target platform — required'),
        topic: z
          .string()
          .max(500)
          .describe('What the post is about'),
        mediaContext: z
          .string()
          .max(300)
          .optional()
          .describe('Optional description of any attached media'),
        variations: z
          .number()
          .int()
          .min(1)
          .max(5)
          .optional()
          .describe('How many caption variations to generate (default 1)'),
      },
      handler: async ({ brandId, ...rest }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return ai.generateCaption(brandId, rest as any);
      },
    },
    {
      name: 'generate_post_ideas',
      description:
        'Generate a list of post ideas for a brand. niche is REQUIRED. If the user has not stated one, call get_brand first to pull the brand niche.',
      inputShape: {
        brandId: z.string(),
        niche: z
          .string()
          .max(200)
          .describe('The brand niche / vertical — required'),
        pillars: z
          .array(z.string())
          .optional()
          .describe('Optional content pillars to focus the ideas around'),
      },
      handler: async ({ brandId, ...rest }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return ai.generateIdeas(brandId, rest as any);
      },
    },
    {
      name: 'generate_hashtags',
      description:
        'Generate popular + niche hashtag suggestions for a topic.',
      inputShape: {
        brandId: z.string(),
        topic: z
          .string()
          .max(200)
          .describe('The topic/caption to generate hashtags for'),
      },
      handler: async ({ brandId, ...rest }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return ai.generateHashtags(brandId, rest as any);
      },
    },
    {
      name: 'preview_comment_reply',
      description:
        'Preview an AI-generated reply to a comment without actually posting it. Useful for tuning AI tone.',
      inputShape: {
        brandId: z.string(),
        platform: z.string(),
        commentText: z.string(),
        authorName: z.string().optional(),
      },
      handler: async ({ brandId, platform, commentText, authorName }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        const cfg = await comments.getAiConfig(brandId);
        const reply = await ai.generateCommentReply(brandId, {
          platform,
          commentText,
          authorName,
          behaviour: cfg.behaviour,
          guidelines: cfg.guidelines,
          niche: cfg.niche,
        } as any);
        return { reply };
      },
    },
    {
      name: 'get_comment_ai_config',
      description:
        'Get the current AI comment-reply config for a brand (toggle + tone + guidelines + niche).',
      inputShape: { brandId: z.string() },
      handler: async ({ brandId }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return comments.getAiConfig(brandId);
      },
    },
    {
      name: 'update_comment_ai_config',
      description:
        'Update the AI comment-reply config: enable/disable, tweak behaviour/tone.',
      inputShape: {
        brandId: z.string(),
        isEnabled: z.boolean().optional(),
        behaviour: z.string().optional(),
      },
      handler: async ({ brandId, ...rest }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return comments.updateAiConfig(brandId, rest as any);
      },
    },
  ];
}

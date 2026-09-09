import { z } from 'zod';
import { PostsService } from '../../posts/posts.service';
import { OwnershipService } from '../ownership.service';
import { AgentTool } from '../tool.types';

type Ctx = { userId: string };

export function buildPostTools(
  ctx: Ctx,
  posts: PostsService,
  ownership: OwnershipService,
): AgentTool[] {
  return [
    {
      name: 'list_posts',
      description:
        'List posts for a brand. Optionally filter by status (Draft, Scheduled, Publishing, Published, Failed).',
      inputShape: {
        brandId: z.string(),
        status: z
          .enum(['Draft', 'Scheduled', 'Publishing', 'Published', 'Failed'])
          .optional(),
      },
      handler: async ({ brandId, status }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return posts.list(brandId, status as any);
      },
    },
    {
      name: 'get_post',
      description: 'Fetch full details of a single post by id.',
      inputShape: { brandId: z.string(), postId: z.string() },
      handler: async ({ brandId, postId }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return posts.findOne(brandId, postId);
      },
    },
    {
      name: 'create_post',
      description:
        'Create a new draft post for a brand. Provide caption/content and target social account ids. Does NOT publish or schedule — call schedule_post or publish_post_now next.',
      inputShape: {
        brandId: z.string(),
        caption: z.string().describe('The post text/caption'),
        accountIds: z
          .array(z.string())
          .describe('Social account ids this post will be published to'),
        mediaUrls: z.array(z.string()).optional(),
      },
      handler: async ({ brandId, caption, accountIds, mediaUrls }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return posts.create(brandId, ctx.userId, {
          caption,
          accountIds,
          mediaUrls: mediaUrls ?? [],
        } as any);
      },
    },
    {
      name: 'schedule_post',
      description:
        'Schedule an existing draft post to publish at a specific ISO timestamp.',
      inputShape: {
        brandId: z.string(),
        postId: z.string(),
        scheduledAt: z.string().describe('ISO 8601 timestamp (UTC)'),
      },
      handler: async ({ brandId, postId, scheduledAt }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return posts.schedule(brandId, postId, { scheduledAt } as any);
      },
    },
    {
      name: 'publish_post_now',
      description:
        'Immediately publish a draft or scheduled post to all its target accounts.',
      inputShape: { brandId: z.string(), postId: z.string() },
      handler: async ({ brandId, postId }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return posts.publishNow(brandId, postId);
      },
    },
    {
      name: 'cancel_scheduled_post',
      description:
        'Cancel a scheduled post (moves it back to Draft). Does NOT delete the post.',
      inputShape: { brandId: z.string(), postId: z.string() },
      handler: async ({ brandId, postId }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return posts.cancel(brandId, postId);
      },
    },
    {
      name: 'update_post',
      description:
        'Update fields on an existing post (caption, media, target accounts). Only pass fields you want to change. Cannot be used on Published posts.',
      inputShape: {
        brandId: z.string(),
        postId: z.string(),
        caption: z.string().optional(),
        accountIds: z.array(z.string()).optional(),
        mediaUrls: z.array(z.string()).optional(),
      },
      handler: async ({ brandId, postId, ...rest }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return posts.update(brandId, postId, rest as any);
      },
    },
  ];
}

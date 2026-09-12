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
        'Create a new draft post for a brand. Provide a title, caption, and the target social account ids to post to. Does NOT publish or schedule — call schedule_post or publish_post_now after this.',
      inputShape: {
        brandId: z.string(),
        title: z.string().describe('Short internal title for the post (1–100 chars)'),
        caption: z.string().describe('The post body/caption shared across all target accounts'),
        accountIds: z
          .array(z.string())
          .describe('Social account ids this post will be published to — must be non-empty'),
        hashtags: z.string().optional().describe('Optional hashtags string to append, e.g. "#nextjs #opensource"'),
      },
      handler: async ({ brandId, title, caption, accountIds, hashtags }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return posts.create(brandId, ctx.userId, {
          title,
          targets: (accountIds ?? []).map((accountId) => ({
            accountId,
            caption,
            hashtags: hashtags ?? null,
          })),
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
      name: 'retry_failed_post',
      description:
        'Retry only the failed publishing destinations for a post. Already-published destinations are never posted again.',
      inputShape: { brandId: z.string(), postId: z.string() },
      handler: async ({ brandId, postId }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return posts.retryFailed(brandId, postId);
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
        'Update fields on an existing draft or scheduled post. Only pass fields you want to change. Cannot be used on Published posts.',
      inputShape: {
        brandId: z.string(),
        postId: z.string(),
        title: z.string().optional(),
        caption: z.string().optional().describe('New caption — replaces caption on all targets'),
        accountIds: z.array(z.string()).optional().describe('Replace target account ids'),
        hashtags: z.string().optional(),
      },
      handler: async ({ brandId, postId, title, caption, accountIds, hashtags }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        const updatePayload: any = {};
        if (title) updatePayload.title = title;
        if (accountIds?.length) {
          updatePayload.targets = accountIds.map((accountId) => ({
            accountId,
            caption: caption ?? '',
            hashtags: hashtags ?? null,
          }));
        }
        return posts.update(brandId, postId, updatePayload);
      },
    },
  ];
}

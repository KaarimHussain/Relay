import { z } from 'zod';
import { TrendsService } from '../../trends/trends.service';
import { OwnershipService } from '../ownership.service';
import { AgentTool } from '../tool.types';

type Ctx = { userId: string };

export function buildTrendTools(
  ctx: Ctx,
  trends: TrendsService,
  ownership: OwnershipService,
): AgentTool[] {
  return [
    {
      name: 'get_trending_hashtags',
      description:
        'Get the current trending hashtags relevant to a brand. Optionally filter by platform (Instagram, TikTok, X, LinkedIn, Facebook).',
      inputShape: {
        brandId: z.string(),
        platform: z.string().optional(),
      },
      handler: async ({ brandId, platform }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return trends.getHashtags(brandId, platform);
      },
    },
    {
      name: 'refresh_trends',
      description:
        'Force a fresh pull of trending hashtags for a brand. Normally cached; use when the user asks for very latest.',
      inputShape: { brandId: z.string() },
      handler: async ({ brandId }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return trends.refreshForBrand(brandId);
      },
    },
  ];
}

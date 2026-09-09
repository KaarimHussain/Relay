import { z } from 'zod';
import { AnalyticsService } from '../../analytics/analytics.service';
import { OwnershipService } from '../ownership.service';
import { AgentTool } from '../tool.types';

type Ctx = { userId: string };

const PLATFORMS = z.enum([
  'Facebook',
  'Instagram',
  'LinkedIn',
  'X',
  'TikTok',
]);

export function buildAnalyticsTools(
  ctx: Ctx,
  analytics: AnalyticsService,
  ownership: OwnershipService,
): AgentTool[] {
  return [
    {
      name: 'get_brand_analytics',
      description:
        'Get an aggregate analytics overview for a brand: totals, engagement rate, breakdown by platform. Optionally filter by ISO date range or platform.',
      inputShape: {
        brandId: z.string(),
        from: z.string().optional().describe('ISO date (inclusive)'),
        to: z.string().optional().describe('ISO date (inclusive)'),
        platform: PLATFORMS.optional(),
      },
      handler: async ({ brandId, from, to, platform }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return analytics.overview(brandId, from, to, platform as any);
      },
    },
    {
      name: 'get_post_analytics',
      description:
        'Get per-platform performance breakdown for a specific post, including snapshot history.',
      inputShape: { brandId: z.string(), postId: z.string() },
      handler: async ({ brandId, postId }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return analytics.postBreakdown(brandId, postId);
      },
    },
    {
      name: 'get_metric_timeseries',
      description:
        'Get a time-series for a specific metric (e.g. impressions, likes, comments, engagementRate) for a brand.',
      inputShape: {
        brandId: z.string(),
        metric: z.string().describe('Metric name (e.g. impressions, likes, comments, engagementRate)'),
        from: z.string().optional(),
        to: z.string().optional(),
        platform: PLATFORMS.optional(),
      },
      handler: async ({ brandId, metric, from, to, platform }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return analytics.timeSeries(brandId, metric, from, to, platform as any);
      },
    },
  ];
}

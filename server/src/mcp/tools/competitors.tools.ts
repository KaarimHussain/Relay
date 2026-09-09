import { z } from 'zod';
import { CompetitorsService } from '../../competitors/competitors.service';
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

export function buildCompetitorTools(
  ctx: Ctx,
  competitors: CompetitorsService,
  ownership: OwnershipService,
): AgentTool[] {
  return [
    {
      name: 'list_competitors',
      description: 'List all competitors being tracked for a brand.',
      inputShape: { brandId: z.string() },
      handler: async ({ brandId }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return competitors.list(brandId);
      },
    },
    {
      name: 'add_competitor',
      description:
        'Add a new competitor for a brand to track (by platform + handle/URL).',
      inputShape: {
        brandId: z.string(),
        name: z.string(),
        platform: PLATFORMS,
        handle: z.string().describe('Platform handle or profile URL'),
        notes: z.string().optional(),
      },
      handler: async ({ brandId, ...rest }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return competitors.create(brandId, rest as any);
      },
    },
    {
      name: 'update_competitor',
      description: 'Update details of an existing competitor.',
      inputShape: {
        brandId: z.string(),
        competitorId: z.string(),
        name: z.string().optional(),
        handle: z.string().optional(),
        notes: z.string().optional(),
      },
      handler: async ({ brandId, competitorId, ...rest }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return competitors.update(brandId, competitorId, rest as any);
      },
    },
    {
      name: 'sync_competitor',
      description:
        'Fetch the latest data (posts + metrics) for a specific competitor.',
      inputShape: { brandId: z.string(), competitorId: z.string() },
      handler: async ({ brandId, competitorId }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return competitors.sync(brandId, competitorId);
      },
    },
    {
      name: 'compare_competitors',
      description:
        'Compare the brand against its tracked competitors on a platform. Returns side-by-side metrics.',
      inputShape: {
        brandId: z.string(),
        platform: PLATFORMS.optional(),
      },
      handler: async ({ brandId, platform }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return competitors.compare(brandId, platform as any);
      },
    },
  ];
}

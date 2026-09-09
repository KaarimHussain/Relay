import { z } from 'zod';
import { BrandsService } from '../../brands/brands.service';
import { OwnershipService } from '../ownership.service';
import { AgentTool } from '../tool.types';

type Ctx = { userId: string };

export function buildBrandTools(
  ctx: Ctx,
  brands: BrandsService,
  ownership: OwnershipService,
): AgentTool[] {
  return [
    {
      name: 'list_brands',
      description:
        'List every brand the current user has access to. Use this first when the user asks about their brands, or when you need a brandId for another tool.',
      inputShape: {},
      handler: async () => brands.listForUser(ctx.userId),
    },
    {
      name: 'create_brand',
      description:
        'Create a brand-new brand under the current user. Only "name" is required; voiceTone/pillars/colorHex are optional but recommended for better AI output.',
      inputShape: {
        name: z.string().min(1).max(60),
        voiceTone: z
          .string()
          .max(500)
          .optional()
          .describe('How this brand talks (e.g. "warm, funny, casual")'),
        pillars: z
          .string()
          .max(500)
          .optional()
          .describe('Content pillars / themes'),
        colorHex: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional()
          .describe('Brand accent color as #RRGGBB'),
      },
      handler: async (dto) => brands.create(ctx.userId, dto as any),
    },
    {
      name: 'get_brand',
      description: 'Fetch a single brand by id, including its AI/config settings.',
      inputShape: { brandId: z.string().describe('The brand id') },
      handler: async ({ brandId }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return brands.findOne(brandId);
      },
    },
    {
      name: 'update_brand',
      description:
        'Update a brand’s editable settings: name, voice/tone, content pillars, or niche. Only pass fields you want to change.',
      inputShape: {
        brandId: z.string(),
        name: z.string().optional(),
        voiceTone: z.string().optional(),
        pillars: z.string().optional(),
        niche: z.string().optional(),
      },
      handler: async ({ brandId, ...rest }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return brands.update(brandId, rest as any);
      },
    },
  ];
}

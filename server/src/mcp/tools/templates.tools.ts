import { z } from 'zod';
import { TemplatesService } from '../../templates/templates.service';
import { OwnershipService } from '../ownership.service';
import { AgentTool } from '../tool.types';

type Ctx = { userId: string };

export function buildTemplateTools(
  ctx: Ctx,
  templates: TemplatesService,
  ownership: OwnershipService,
): AgentTool[] {
  return [
    {
      name: 'list_templates',
      description: 'List reply/message templates for a brand.',
      inputShape: { brandId: z.string() },
      handler: async ({ brandId }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return templates.list(brandId);
      },
    },
    {
      name: 'create_template',
      description: 'Create a new reply template for a brand.',
      inputShape: {
        brandId: z.string(),
        name: z.string(),
        content: z.string(),
        platform: z.string().optional(),
      },
      handler: async ({ brandId, ...rest }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return templates.create(brandId, rest as any);
      },
    },
    {
      name: 'update_template',
      description: 'Update an existing template.',
      inputShape: {
        brandId: z.string(),
        templateId: z.string(),
        name: z.string().optional(),
        content: z.string().optional(),
        platform: z.string().optional(),
      },
      handler: async ({ brandId, templateId, ...rest }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return templates.update(brandId, templateId, rest as any);
      },
    },
  ];
}

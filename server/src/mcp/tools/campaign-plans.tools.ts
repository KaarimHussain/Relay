import { z } from 'zod';
import { CampaignPlansService } from '../../campaign-plans/campaign-plans.service';
import { AgentTool } from '../tool.types';

type Ctx = { userId: string };

export function buildCampaignPlanTools(
  ctx: Ctx,
  campaigns: CampaignPlansService,
): AgentTool[] {
  return [
    {
      name: 'create_campaign_plan',
      description:
        'Create a structured, approval-gated campaign plan for multiple posts. Use this when the user asks for a campaign, content calendar, or multiple drafts/schedules. First use list_brands and list_connected_accounts to obtain valid ids. This tool only creates a plan for review; it never creates or schedules posts until the user approves the plan in Relay.',
      inputShape: {
        brandId: z.string(),
        name: z.string().min(1).max(120).describe('A concise campaign name'),
        objective: z.string().max(1000).optional().describe('The campaign goal and audience'),
        platform: z.string().max(40).optional().describe('Primary platform, when applicable'),
        posts: z.array(z.object({
          title: z.string().min(1).max(200),
          caption: z.string().min(1),
          accountIds: z.array(z.string()).min(1),
          scheduledAt: z.string().optional().describe('Optional ISO 8601 schedule timestamp. Omit to create a draft.'),
        })).min(2).max(30),
      },
      handler: (input) => campaigns.create(ctx.userId, input as any),
    },
  ];
}

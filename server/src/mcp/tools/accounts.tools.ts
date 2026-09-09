import { z } from 'zod';
import { AccountsService } from '../../accounts/accounts.service';
import { OwnershipService } from '../ownership.service';
import { AgentTool } from '../tool.types';

type Ctx = { userId: string };

export function buildAccountTools(
  ctx: Ctx,
  accounts: AccountsService,
  ownership: OwnershipService,
): AgentTool[] {
  return [
    {
      name: 'list_connected_accounts',
      description:
        'List all social accounts (Facebook, Instagram, LinkedIn, X, TikTok) connected to a brand.',
      inputShape: { brandId: z.string() },
      handler: async ({ brandId }) => {
        await ownership.assertBrandAccess(ctx.userId, brandId);
        return accounts.list(brandId);
      },
    },
  ];
}

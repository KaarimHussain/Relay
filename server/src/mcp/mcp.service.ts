import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BrandsService } from '../brands/brands.service';
import { AccountsService } from '../accounts/accounts.service';
import { PostsService } from '../posts/posts.service';
import { CommentsService } from '../comments/comments.service';
import { TemplatesService } from '../templates/templates.service';
import { AiService } from '../ai/ai.service';
import { CompetitorsService } from '../competitors/competitors.service';
import { TrendsService } from '../trends/trends.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { OwnershipService } from './ownership.service';
import { AgentTool } from './tool.types';
import { buildBrandTools } from './tools/brands.tools';
import { buildAccountTools } from './tools/accounts.tools';
import { buildPostTools } from './tools/posts.tools';
import { buildCommentTools } from './tools/comments.tools';
import { buildTemplateTools } from './tools/templates.tools';
import { buildAiTools } from './tools/ai.tools';
import { buildCompetitorTools } from './tools/competitors.tools';
import { buildTrendTools } from './tools/trends.tools';
import { buildAnalyticsTools } from './tools/analytics.tools';

@Injectable()
export class McpService {
  constructor(
    private brands: BrandsService,
    private accounts: AccountsService,
    private posts: PostsService,
    private comments: CommentsService,
    private templates: TemplatesService,
    private ai: AiService,
    private competitors: CompetitorsService,
    private trends: TrendsService,
    private analytics: AnalyticsService,
    private ownership: OwnershipService,
  ) {}

  buildToolsForUser(userId: string): AgentTool[] {
    const ctx = { userId };
    return [
      ...buildBrandTools(ctx, this.brands, this.ownership),
      ...buildAccountTools(ctx, this.accounts, this.ownership),
      ...buildPostTools(ctx, this.posts, this.ownership),
      ...buildCommentTools(ctx, this.comments, this.ownership),
      ...buildTemplateTools(ctx, this.templates, this.ownership),
      ...buildAiTools(ctx, this.ai, this.comments, this.ownership),
      ...buildCompetitorTools(ctx, this.competitors, this.ownership),
      ...buildTrendTools(ctx, this.trends, this.ownership),
      ...buildAnalyticsTools(ctx, this.analytics, this.ownership),
    ];
  }

  buildServerForUser(userId: string): McpServer {
    const server = new McpServer({ name: 'relay-mcp', version: '1.0.0' });
    const tools = this.buildToolsForUser(userId);
    for (const t of tools) {
      server.tool(t.name, t.description, t.inputShape, async (args: any) => {
        const result = await t.handler(args);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      });
    }
    return server;
  }
}

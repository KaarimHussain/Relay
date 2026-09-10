import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, CampaignPlanStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PostsService } from '../posts/posts.service';
import { OwnershipService } from '../mcp/ownership.service';

export type PlannedPost = {
  title: string;
  caption: string;
  accountIds: string[];
  scheduledAt?: string;
};

export type CreateCampaignPlanInput = {
  brandId: string;
  name: string;
  objective?: string;
  platform?: string;
  posts: PlannedPost[];
};

@Injectable()
export class CampaignPlansService {
  constructor(
    private prisma: PrismaService,
    private posts: PostsService,
    private ownership: OwnershipService,
  ) {}

  private async validatePlan(brandId: string, posts: PlannedPost[]) {
    if (!posts.length) throw new BadRequestException('A campaign plan needs at least one post');
    const accountIds = [...new Set(posts.flatMap((post) => post.accountIds))];
    if (!accountIds.length) throw new BadRequestException('Each campaign post needs at least one target account');
    const accounts = await this.prisma.socialAccount.findMany({
      where: { id: { in: accountIds }, brandId, status: AccountStatus.Active },
      select: { id: true },
    });
    if (accounts.length !== accountIds.length) {
      throw new BadRequestException('Every campaign target must be an active account for this brand');
    }
    for (const post of posts) {
      if (!post.accountIds.length) throw new BadRequestException('Each campaign post needs at least one target account');
      if (post.scheduledAt && Number.isNaN(new Date(post.scheduledAt).getTime())) {
        throw new BadRequestException('Campaign schedule dates must be valid ISO timestamps');
      }
    }
  }

  async create(userId: string, input: CreateCampaignPlanInput) {
    await this.ownership.assertBrandAccess(userId, input.brandId);
    await this.validatePlan(input.brandId, input.posts);
    return this.prisma.campaignPlan.create({
      data: {
        userId,
        brandId: input.brandId,
        name: input.name,
        objective: input.objective,
        platform: input.platform,
        posts: input.posts,
      },
    });
  }

  async findOne(userId: string, planId: string) {
    const plan = await this.prisma.campaignPlan.findFirst({ where: { id: planId, userId } });
    if (!plan) throw new NotFoundException('Campaign plan not found');
    return plan;
  }

  async approveAndExecute(userId: string, planId: string) {
    const plan = await this.findOne(userId, planId);
    if (plan.status === CampaignPlanStatus.Completed) return plan;
    if (plan.status !== CampaignPlanStatus.Pending) {
      throw new BadRequestException('This campaign plan is already being processed or failed');
    }

    await this.ownership.assertBrandAccess(userId, plan.brandId);
    const plannedPosts = plan.posts as unknown as PlannedPost[];
    await this.validatePlan(plan.brandId, plannedPosts);
    await this.prisma.campaignPlan.update({
      where: { id: plan.id },
      data: { status: CampaignPlanStatus.Executing },
    });

    try {
      const createdPosts = [] as Array<{ id: string; title: string; status: string; scheduledAt: Date | null }>;
      for (const plannedPost of plannedPosts) {
        const accountIds = [...new Set(plannedPost.accountIds)];
        const post = await this.posts.create(plan.brandId, userId, {
          title: plannedPost.title,
          targets: accountIds.map((accountId) => ({ accountId, caption: plannedPost.caption })),
        });
        const completed = plannedPost.scheduledAt
          ? await this.posts.schedule(plan.brandId, post.id, { scheduledAt: plannedPost.scheduledAt })
          : post;
        createdPosts.push({
          id: completed.id,
          title: completed.title,
          status: completed.status,
          scheduledAt: completed.scheduledAt,
        });
      }
      return await this.prisma.campaignPlan.update({
        where: { id: plan.id },
        data: {
          status: CampaignPlanStatus.Completed,
          executedAt: new Date(),
          executionResult: { createdPosts },
        },
      });
    } catch (error: any) {
      await this.prisma.campaignPlan.update({
        where: { id: plan.id },
        data: { status: CampaignPlanStatus.Failed, error: error?.message ?? 'Campaign execution failed' },
      });
      throw error;
    }
  }
}

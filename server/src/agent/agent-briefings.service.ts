import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AccountStatus, PostStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type BriefingItem = {
  kind: 'scheduled' | 'failed' | 'comments' | 'accounts' | 'next_step';
  title: string;
  detail: string;
  href: string;
  priority: 'info' | 'warning' | 'urgent';
};

@Injectable()
export class AgentBriefingsService {
  private readonly logger = new Logger(AgentBriefingsService.name);

  constructor(private prisma: PrismaService) {}

  private dateKey(period: 'daily' | 'weekly') {
    const now = new Date();
    if (period === 'daily') return now.toISOString().slice(0, 10);
    const monday = new Date(now);
    const day = monday.getUTCDay() || 7;
    monday.setUTCDate(monday.getUTCDate() - day + 1);
    return monday.toISOString().slice(0, 10);
  }

  async latest(userId: string) {
    return this.prisma.agentBriefing.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async generate(userId: string, period: 'daily' | 'weekly' = 'daily', force = false) {
    const dateKey = this.dateKey(period);
    if (!force) {
      const existing = await this.prisma.agentBriefing.findUnique({
        where: { userId_period_dateKey: { userId, period, dateKey } },
      });
      if (existing) return existing;
    }

    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { brand: { select: { id: true, name: true } } },
    });
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const items: BriefingItem[] = [];

    for (const membership of memberships) {
      const { id: brandId, name } = membership.brand;
      const [scheduled, failed, awaitingComments, accountIssues] = await Promise.all([
        this.prisma.post.findMany({
          where: { brandId, status: PostStatus.Scheduled, scheduledAt: { gte: now, lte: weekFromNow } },
          orderBy: { scheduledAt: 'asc' },
          take: 3,
          select: { title: true, scheduledAt: true },
        }),
        this.prisma.post.count({ where: { brandId, status: PostStatus.Failed, updatedAt: { gte: sevenDaysAgo } } }),
        this.prisma.comment.count({ where: { brandId, isReply: false, replies: { none: {} } } }),
        this.prisma.socialAccount.count({
          where: {
            brandId,
            OR: [
              { status: { in: [AccountStatus.Expired, AccountStatus.Disconnected] } },
              { tokenExpiresAt: { not: null, lte: weekFromNow } },
            ],
          },
        }),
      ]);

      if (scheduled.length) {
        const next = scheduled[0];
        items.push({
          kind: 'scheduled', priority: 'info', href: '/queue',
          title: `${scheduled.length} post${scheduled.length === 1 ? '' : 's'} scheduled for ${name}`,
          detail: `Next: “${next.title}” on ${next.scheduledAt?.toLocaleString() ?? 'the scheduled date'}.`,
        });
      }
      if (failed) items.push({
        kind: 'failed', priority: 'urgent', href: '/queue',
        title: `${failed} failed post${failed === 1 ? '' : 's'} need attention for ${name}`,
        detail: 'Review the publishing errors and retry or update the affected posts.',
      });
      if (awaitingComments) items.push({
        kind: 'comments', priority: 'warning', href: '/comments',
        title: `${awaitingComments} comment${awaitingComments === 1 ? '' : 's'} awaiting a reply for ${name}`,
        detail: 'Review recent conversations and decide which ones deserve a response.',
      });
      if (accountIssues) items.push({
        kind: 'accounts', priority: 'urgent', href: '/accounts',
        title: `${accountIssues} account connection${accountIssues === 1 ? '' : 's'} need attention for ${name}`,
        detail: 'Reconnect expired accounts or refresh credentials before the next scheduled post.',
      });
    }

    if (!items.length) items.push({
      kind: 'next_step', priority: 'info', href: '/agent',
      title: 'Your workspace is in good shape',
      detail: 'Ask Relay Agent to draft your next post or plan a campaign.',
    });

    return this.prisma.agentBriefing.upsert({
      where: { userId_period_dateKey: { userId, period, dateKey } },
      create: { userId, period, dateKey, items },
      update: { items, createdAt: new Date() },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async generateDailyBriefings() {
    await this.generateForAllUsers('daily');
  }

  @Cron('0 8 * * 1')
  async generateWeeklyBriefings() {
    await this.generateForAllUsers('weekly');
  }

  private async generateForAllUsers(period: 'daily' | 'weekly') {
    const users = await this.prisma.user.findMany({
      where: { memberships: { some: {} } },
      select: { id: true },
    });
    for (const user of users) {
      try {
        await this.generate(user.id, period);
      } catch (error: any) {
        this.logger.error(`Could not generate ${period} briefing for ${user.id}: ${error?.message ?? error}`);
      }
    }
  }
}

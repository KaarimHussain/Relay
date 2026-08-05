import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async overview(brandId: string, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    const snapshots = await this.prisma.analyticsSnapshot.findMany({
      where: {
        takenAt: { gte: fromDate, lte: toDate },
        target: { post: { brandId } },
      },
      include: { target: { include: { account: { select: { platform: true } } } } },
    });

    const totals = snapshots.reduce(
      (acc, s) => ({
        reach: acc.reach + s.reach,
        impressions: acc.impressions + s.impressions,
        likes: acc.likes + s.likes,
        comments: acc.comments + s.comments,
        shares: acc.shares + s.shares,
        saves: acc.saves + s.saves,
        clicks: acc.clicks + s.clicks,
        count: acc.count + 1,
      }),
      { reach: 0, impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0, count: 0 },
    );

    const engagements = totals.likes + totals.comments + totals.shares + totals.saves;
    const engagementRate = totals.impressions > 0 ? ((engagements / totals.impressions) * 100).toFixed(2) : '0';

    const byPlatform: Record<string, typeof totals> = {};
    for (const s of snapshots) {
      const p = s.target.account.platform;
      if (!byPlatform[p]) byPlatform[p] = { reach: 0, impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0, count: 0 };
      byPlatform[p].reach += s.reach;
      byPlatform[p].impressions += s.impressions;
      byPlatform[p].likes += s.likes;
      byPlatform[p].comments += s.comments;
      byPlatform[p].shares += s.shares;
      byPlatform[p].count++;
    }

    return { period: { from: fromDate, to: toDate }, totals, engagementRate: Number(engagementRate), byPlatform };
  }

  async postBreakdown(brandId: string, postId: string) {
    const targets = await this.prisma.postPlatformTarget.findMany({
      where: { postId, post: { brandId } },
      include: {
        account: { select: { platform: true, platformHandle: true } },
        snapshots: { orderBy: { takenAt: 'desc' } },
      },
    });

    return targets.map(t => ({
      targetId: t.id,
      platform: t.account.platform,
      handle: t.account.platformHandle,
      status: t.status,
      publishedAt: t.publishedAt,
      latestSnapshot: t.snapshots[0] ?? null,
      snapshotHistory: t.snapshots,
    }));
  }

  // Called by the scheduled analytics job
  async recordSnapshot(targetId: string, metrics: {
    reach: number; impressions: number; likes: number; comments: number;
    shares: number; saves: number; clicks: number;
  }) {
    return this.prisma.analyticsSnapshot.create({ data: { targetId, ...metrics } });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { PostStatus, Platform } from '@prisma/client';

interface Metrics {
  reach: number; impressions: number; likes: number; comments: number;
  shares: number; saves: number; clicks: number;
}

// ─── Platform insight fetchers ─────────────────────────────────────────────────

/**
 * Fetch lifetime insight metrics, resilient to Meta's frequent metric deprecations
 * (e.g. `impressions` removed in v22). Tries the batch first; if Meta rejects it with
 * an invalid-metric error (#100), it probes each metric individually and keeps the
 * ones that still work, so one dead metric never zeroes out the whole request.
 */
async function fetchInsightValues(base: string, metrics: string[], accessToken: string): Promise<Record<string, number>> {
  const url = (m: string[]) => `${base}/insights?metric=${m.join(',')}&period=lifetime&access_token=${accessToken}`;
  const parse = (data: any): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const item of data.data ?? []) out[item.name] = item.values?.[0]?.value ?? item.value ?? 0;
    return out;
  };

  const res = await fetch(url(metrics));
  const data = await res.json() as any;
  if (!data.error) return parse(data);
  if (data.error.code !== 100) throw new Error(data.error.message ?? 'Insights error');

  // An invalid metric was in the batch — probe each metric on its own, ignore failures.
  const out: Record<string, number> = {};
  await Promise.all(metrics.map(async (m) => {
    try {
      const r = await fetch(url([m]));
      const d = await r.json() as any;
      if (!d.error) Object.assign(out, parse(d));
    } catch { /* skip a metric that's no longer supported */ }
  }));
  return out;
}

async function fetchFacebookInsights(postId: string, accessToken: string): Promise<Metrics> {
  const base = `https://graph.facebook.com/v21.0/${postId}`;
  const [insights, engRes] = await Promise.all([
    fetchInsightValues(base, ['post_impressions', 'post_impressions_unique', 'post_clicks'], accessToken),
    fetch(`${base}?fields=reactions.summary(true),comments.summary(true),shares&access_token=${accessToken}`),
  ]);
  const engData = await engRes.json() as any;
  if (engData.error) throw new Error(engData.error.message ?? 'Facebook engagement error');
  return {
    impressions: insights['post_impressions'] ?? 0,
    reach:       insights['post_impressions_unique'] ?? 0,
    clicks:      insights['post_clicks'] ?? 0,
    likes:       (engData.reactions?.summary?.total_count ?? 0) as number,
    comments:    (engData.comments?.summary?.total_count ?? 0) as number,
    shares:      (engData.shares?.count ?? 0) as number,
    saves:       0,
  };
}

async function fetchInstagramInsights(mediaId: string, accessToken: string): Promise<Metrics> {
  const base = `https://graph.facebook.com/v21.0/${mediaId}`;
  // `impressions` was removed in v22 → use `views`. Likes/comments come straight from
  // the media node (always available), which is more reliable than the insight metrics.
  const [insights, engRes] = await Promise.all([
    fetchInsightValues(base, ['reach', 'saved', 'shares', 'views'], accessToken),
    fetch(`${base}?fields=like_count,comments_count&access_token=${accessToken}`),
  ]);
  const eng = await engRes.json() as any;
  if (eng.error) throw new Error(eng.error.message ?? 'Instagram media error');
  return {
    impressions: insights['views'] ?? insights['impressions'] ?? 0,
    reach:       insights['reach'] ?? 0,
    likes:       (eng.like_count ?? 0) as number,
    comments:    (eng.comments_count ?? 0) as number,
    shares:      insights['shares'] ?? 0,
    saves:       insights['saved'] ?? 0,
    clicks:      0,
  };
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private accounts: AccountsService,
  ) {}

  async overview(brandId: string, from?: string, to?: string, platform?: Platform) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    const snapshots = await this.prisma.analyticsSnapshot.findMany({
      where: {
        takenAt: { gte: fromDate, lte: toDate },
        target: { post: { brandId }, ...(platform ? { account: { platform } } : {}) },
      },
      include: { target: { include: { account: { select: { platform: true } } } } },
      orderBy: { takenAt: 'asc' },
    });

    // Snapshots store cumulative (lifetime) metrics — each one is the post's
    // running total, not a per-hour delta. Summing every snapshot would grossly
    // over-count, so keep only the latest snapshot per target.
    const latestByTarget = new Map<string, (typeof snapshots)[number]>();
    for (const s of snapshots) latestByTarget.set(s.targetId, s); // asc order → last wins
    const latest = [...latestByTarget.values()];

    const totals = latest.reduce(
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
    for (const s of latest) {
      const p = s.target.account.platform;
      if (!byPlatform[p]) byPlatform[p] = { reach: 0, impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0, count: 0 };
      byPlatform[p].reach += s.reach;
      byPlatform[p].impressions += s.impressions;
      byPlatform[p].likes += s.likes;
      byPlatform[p].comments += s.comments;
      byPlatform[p].shares += s.shares;
      byPlatform[p].saves += s.saves;
      byPlatform[p].clicks += s.clicks;
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

  async timeSeries(brandId: string, metric: string, from?: string, to?: string, platform?: Platform) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86_400_000);
    const toDate = to ? new Date(to) : new Date();

    const snapshots = await this.prisma.analyticsSnapshot.findMany({
      where: {
        takenAt: { gte: fromDate, lte: toDate },
        target: { post: { brandId }, ...(platform ? { account: { platform } } : {}) },
      },
      orderBy: { takenAt: 'asc' },
    });

    const validMetrics = new Set(['reach', 'impressions', 'likes', 'comments', 'shares', 'saves', 'clicks']);
    const valueOf = (snap: (typeof snapshots)[number]): number => {
      if (metric === 'engagements') return snap.likes + snap.comments + snap.shares;
      if (validMetrics.has(metric)) return (snap as unknown as Record<string, number>)[metric] ?? 0;
      return 0;
    };

    // Every day in the range, in order.
    const days: string[] = [];
    const cursor = new Date(fromDate);
    while (cursor <= toDate) {
      days.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }

    // Snapshots are cumulative, so per target per day we keep the LAST value seen
    // that day. targetId -> (day -> cumulative value)
    const perTargetDay = new Map<string, Map<string, number>>();
    for (const snap of snapshots) {
      const day = snap.takenAt.toISOString().slice(0, 10);
      let dayMap = perTargetDay.get(snap.targetId);
      if (!dayMap) { dayMap = new Map(); perTargetDay.set(snap.targetId, dayMap); }
      dayMap.set(day, valueOf(snap)); // asc order → latest that day wins
    }

    // Forward-fill each target's cumulative value across days (a post's total
    // carries forward on days it wasn't re-sampled), then sum across all targets.
    const result = days.map((date) => ({ date, value: 0 }));
    for (const dayMap of perTargetDay.values()) {
      let last = 0;
      let started = false;
      for (let i = 0; i < days.length; i++) {
        if (dayMap.has(days[i])) { last = dayMap.get(days[i])!; started = true; }
        if (started) result[i].value += last;
      }
    }

    return result;
  }

  async recordSnapshot(targetId: string, metrics: Metrics) {
    return this.prisma.analyticsSnapshot.create({ data: { targetId, ...metrics } });
  }

  // ── Collection (shared by the hourly scheduler and the manual "Refresh") ───────

  /** Fetch fresh insights for one published target and store a snapshot. */
  private async collectTarget(target: { id: string; accountId: string; externalPostId: string | null }) {
    const { accessToken, platform } = await this.accounts.getDecryptedAccount(target.accountId);
    const externalPostId = target.externalPostId!;

    let metrics: Metrics;
    if (platform === 'Facebook')       metrics = await fetchFacebookInsights(externalPostId, accessToken);
    else if (platform === 'Instagram') metrics = await fetchInstagramInsights(externalPostId, accessToken);
    else return { skipped: true as const, platform };

    await this.recordSnapshot(target.id, metrics);
    return { skipped: false as const, platform };
  }

  /** On-demand collection for a single brand — powers the "Refresh data" button. */
  async collectForBrand(brandId: string) {
    const targets = await this.prisma.postPlatformTarget.findMany({
      where: { status: PostStatus.Published, externalPostId: { not: null }, post: { brandId } },
      include: { account: { select: { platform: true } } },
    });

    let collected = 0;
    const errors: string[] = [];
    for (const target of targets) {
      try {
        const res = await this.collectTarget(target);
        if (!res.skipped) collected++;
      } catch (err: any) {
        errors.push(`${target.account.platform}: ${err.message}`);
      }
    }

    return {
      collected,
      targets: targets.length,
      errors,
      message: targets.length === 0 ? 'No published Facebook or Instagram posts to collect analytics from yet.' : undefined,
    };
  }

  /** Global collection across all brands — called by the hourly scheduler. */
  async collectAllPublished() {
    const targets = await this.prisma.postPlatformTarget.findMany({
      where: { status: PostStatus.Published, externalPostId: { not: null } },
    });
    this.logger.log(`Collecting analytics for ${targets.length} published targets`);

    for (const target of targets) {
      try {
        await this.collectTarget(target);
      } catch (err: any) {
        this.logger.warn(`Analytics collection failed for target ${target.id}: ${err.message}`);
      }
    }
  }
}

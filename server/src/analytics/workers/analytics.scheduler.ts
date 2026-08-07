import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from '../analytics.service';
import { AccountsService } from '../../accounts/accounts.service';
import { PostStatus } from '@prisma/client';

// ─── Platform fetchers ────────────────────────────────────────────────────────

async function fetchFacebookInsights(postId: string, accessToken: string) {
  const base = `https://graph.facebook.com/v21.0/${postId}`;

  const [insightsRes, engRes] = await Promise.all([
    fetch(`${base}/insights?metric=post_impressions,post_impressions_unique,post_clicks&period=lifetime&access_token=${accessToken}`),
    fetch(`${base}?fields=reactions.summary(true),comments.summary(true),shares&access_token=${accessToken}`),
  ]);

  const [insightsData, engData] = await Promise.all([insightsRes.json(), engRes.json()]) as [any, any];

  if (insightsData.error || engData.error) {
    throw new Error(insightsData.error?.message ?? engData.error?.message ?? 'Facebook Insights error');
  }

  const getValue = (name: string): number => {
    const item = insightsData.data?.find((d: any) => d.name === name);
    // lifetime insights return a single value object
    return item?.values?.[0]?.value ?? item?.value ?? 0;
  };

  return {
    impressions: getValue('post_impressions'),
    reach:       getValue('post_impressions_unique'),
    clicks:      getValue('post_clicks'),
    likes:       (engData.reactions?.summary?.total_count ?? 0) as number,
    comments:    (engData.comments?.summary?.total_count ?? 0) as number,
    shares:      (engData.shares?.count ?? 0) as number,
    saves:       0,
  };
}

async function fetchInstagramInsights(mediaId: string, accessToken: string) {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${mediaId}/insights?metric=impressions,reach,likes,comments,shares,saved&period=lifetime&access_token=${accessToken}`
  );
  const data = await res.json() as any;

  if (data.error) throw new Error(data.error.message ?? 'Instagram Insights error');

  const getValue = (name: string): number => {
    const item = data.data?.find((d: any) => d.name === name);
    return item?.values?.[0]?.value ?? item?.value ?? 0;
  };

  return {
    impressions: getValue('impressions'),
    reach:       getValue('reach'),
    likes:       getValue('likes'),
    comments:    getValue('comments'),
    shares:      getValue('shares'),
    saves:       getValue('saved'),
    clicks:      0,
  };
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

@Injectable()
export class AnalyticsScheduler {
  private readonly logger = new Logger(AnalyticsScheduler.name);

  constructor(
    private prisma: PrismaService,
    private analytics: AnalyticsService,
    private accounts: AccountsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async collectAnalytics() {
    const targets = await this.prisma.postPlatformTarget.findMany({
      where: { status: PostStatus.Published, externalPostId: { not: null } },
      include: { account: { select: { id: true, platform: true } } },
    });

    this.logger.log(`Collecting analytics for ${targets.length} published targets`);

    for (const target of targets) {
      try {
        const { accessToken, platform } = await this.accounts.getDecryptedAccount(target.accountId);
        const externalPostId = target.externalPostId!;

        let metrics: { reach: number; impressions: number; likes: number; comments: number; shares: number; saves: number; clicks: number };

        if (platform === 'Facebook') {
          metrics = await fetchFacebookInsights(externalPostId, accessToken);
        } else if (platform === 'Instagram') {
          metrics = await fetchInstagramInsights(externalPostId, accessToken);
        } else {
          // Platforms not yet implemented — skip rather than fabricate
          continue;
        }

        await this.analytics.recordSnapshot(target.id, metrics);
        this.logger.debug(`Recorded ${platform} snapshot for target ${target.id}`);
      } catch (err: any) {
        this.logger.warn(`Analytics collection failed for target ${target.id}: ${err.message}`);
      }
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { decrypt } from '../common/crypto.util';

// Instagram: 30 unique hashtag lookups per 7-day rolling window per IG account.
const IG_SEED_HASHTAGS: Array<{ tag: string; category: string }> = [
  { tag: 'SmallBizSaturday', category: 'Commerce' },
  { tag: 'BehindTheScenes',  category: 'Lifestyle' },
  { tag: 'AITools',          category: 'Tech' },
  { tag: 'MorningRoutine',   category: 'Wellness' },
  { tag: 'FounderTips',      category: 'Business' },
  { tag: 'OOTD',             category: 'Fashion' },
  { tag: 'ProductLaunch',    category: 'Commerce' },
  { tag: 'RemoteWork',       category: 'Business' },
  { tag: 'Motivation',       category: 'General' },
  { tag: 'ContentCreator',   category: 'Lifestyle' },
  { tag: 'SocialMediaTips',  category: 'Marketing' },
  { tag: 'Entrepreneurship', category: 'Business' },
];

// LinkedIn: follower count growth signals which topics are gaining traction.
const LI_SEED_HASHTAGS: Array<{ tag: string; category: string }> = [
  { tag: 'artificialintelligence', category: 'Tech' },
  { tag: 'leadership',            category: 'Business' },
  { tag: 'marketing',             category: 'Marketing' },
  { tag: 'innovation',            category: 'Tech' },
  { tag: 'startup',               category: 'Business' },
  { tag: 'productivity',          category: 'Lifestyle' },
  { tag: 'sales',                 category: 'Business' },
  { tag: 'remotework',            category: 'Business' },
  { tag: 'careerdevelopment',     category: 'Career' },
  { tag: 'contentmarketing',      category: 'Marketing' },
  { tag: 'entrepreneurship',      category: 'Business' },
  { tag: 'technology',            category: 'Tech' },
];

const ONE_HOUR_MS = 60 * 60 * 1000;

function heatLevel(growthPct: number): 'hot' | 'rising' | 'steady' {
  if (growthPct >= 50) return 'hot';
  if (growthPct >= 15) return 'rising';
  return 'steady';
}

@Injectable()
export class TrendsService {
  private readonly logger = new Logger(TrendsService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Public API ───────────────────────────────────────────────────────────

  async getHashtags(brandId: string, platform?: string) {
    const cached = await this.prisma.trendCache.findMany({
      where: { brandId, ...(platform && platform !== 'all' ? { platform } : {}) },
      orderBy: { updatedAt: 'desc' },
    });

    return cached.map((c) => {
      const growthPct = c.prevCount > 0
        ? Math.round(((c.mediaCount - c.prevCount) / c.prevCount) * 100)
        : 0;
      return {
        tag:       c.tag,
        platform:  c.platform,
        category:  c.category,
        posts:     c.mediaCount,
        growthPct,
        heat:      heatLevel(growthPct),
        updatedAt: c.updatedAt,
        isLive:    true,
      };
    });
  }

  /** On-demand refresh for one brand — triggered by the "Refresh" button on the frontend. */
  async refreshForBrand(brandId: string): Promise<{ refreshed: number; errors: string[]; platform: string | null }> {
    let totalRefreshed = 0;
    const allErrors: string[] = [];
    const activePlatforms: string[] = [];

    // Instagram
    const igAccount = await this.prisma.socialAccount.findFirst({
      where: { brandId, platform: 'Instagram', status: 'Active' },
      select: { platformUserId: true, accessToken: true },
    });
    if (igAccount) {
      const token = decrypt(igAccount.accessToken);
      const { refreshed, errors } = await this.fetchInstagramHashtags(
        brandId, igAccount.platformUserId, token,
      );
      totalRefreshed += refreshed;
      allErrors.push(...errors);
      activePlatforms.push('Instagram');
    }

    // LinkedIn
    const liAccount = await this.prisma.socialAccount.findFirst({
      where: { brandId, platform: 'LinkedIn', status: 'Active' },
      select: { accessToken: true },
    });
    if (liAccount) {
      const token = decrypt(liAccount.accessToken);
      const { refreshed, errors } = await this.fetchLinkedInHashtags(brandId, token);
      totalRefreshed += refreshed;
      allErrors.push(...errors);
      activePlatforms.push('LinkedIn');
    }

    return {
      refreshed: totalRefreshed,
      errors:    allErrors,
      platform:  activePlatforms.length > 0 ? activePlatforms.join(' & ') : null,
    };
  }

  // ─── Scheduler: refresh all brands daily at 6 AM ─────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async refreshAllBrands() {
    const brands = await this.prisma.brand.findMany({
      select: { id: true },
    });

    for (const brand of brands) {
      try {
        await this.refreshForBrand(brand.id);
        this.logger.log(`Trends: scheduled refresh done for brand ${brand.id}`);
      } catch (err: any) {
        this.logger.warn(`Trends: scheduled refresh failed for brand ${brand.id}: ${err.message}`);
      }
    }
  }

  // ─── Instagram Graph API hashtag fetcher ─────────────────────────────────

  private async fetchInstagramHashtags(
    brandId: string,
    igUserId: string,
    accessToken: string,
  ): Promise<{ refreshed: number; errors: string[] }> {
    let refreshed = 0;
    const errors: string[] = [];

    for (const seed of IG_SEED_HASHTAGS) {
      try {
        // Step 1 — resolve the hashtag ID
        const searchRes = await fetch(
          `https://graph.facebook.com/v21.0/ig_hashtag_search` +
          `?user_id=${igUserId}&q=${encodeURIComponent(seed.tag)}&access_token=${accessToken}`,
        );
        const searchData = await searchRes.json() as any;
        if (searchData.error) throw new Error(searchData.error.message);
        const hashtagId: string | undefined = searchData.data?.[0]?.id;
        if (!hashtagId) continue;

        // Step 2 — get engagement from top media.
        // media_count on hashtag nodes is only available in Live Mode (published app);
        // top_media works in dev mode and gives a better trending signal.
        const mediaRes = await fetch(
          `https://graph.facebook.com/v21.0/${hashtagId}/top_media` +
          `?fields=like_count,comments_count&limit=10&user_id=${igUserId}&access_token=${accessToken}`,
        );
        const mediaData = await mediaRes.json() as any;
        if (mediaData.error) throw new Error(mediaData.error.message);
        const posts: Array<{ like_count?: number; comments_count?: number }> = mediaData.data ?? [];
        const mediaCount = posts.reduce(
          (sum, p) => sum + (p.like_count ?? 0) + (p.comments_count ?? 0),
          0,
        );

        // Step 3 — upsert; prevCount rotates only after 23 h to preserve growth window
        const existing = await this.prisma.trendCache.findUnique({
          where: { brandId_platform_tag: { brandId, platform: 'Instagram', tag: `#${seed.tag}` } },
        });
        const shouldRotate = !existing
          || (Date.now() - existing.updatedAt.getTime()) > 23 * ONE_HOUR_MS;

        await this.prisma.trendCache.upsert({
          where:  { brandId_platform_tag: { brandId, platform: 'Instagram', tag: `#${seed.tag}` } },
          create: { brandId, platform: 'Instagram', tag: `#${seed.tag}`, category: seed.category, mediaCount, prevCount: mediaCount, externalId: hashtagId },
          update: {
            prevCount: shouldRotate ? (existing?.mediaCount ?? mediaCount) : (existing?.prevCount ?? mediaCount),
            mediaCount,
            externalId: hashtagId,
          },
        });

        refreshed++;
      } catch (err: any) {
        errors.push(`#${seed.tag}: ${err.message}`);
        this.logger.warn(`Trends: IG hashtag #${seed.tag} failed: ${err.message}`);
      }
    }

    return { refreshed, errors };
  }

  // ─── LinkedIn hashtag follower-count fetcher ──────────────────────────────
  // Tracks follower count growth as a proxy for topic momentum.
  // Requires r_organization_social scope on the connected LinkedIn account.

  private async fetchLinkedInHashtags(
    brandId: string,
    accessToken: string,
  ): Promise<{ refreshed: number; errors: string[] }> {
    let refreshed = 0;
    const errors: string[] = [];

    for (const seed of LI_SEED_HASHTAGS) {
      try {
        const res = await fetch(
          `https://api.linkedin.com/rest/hashtagsV2?q=hashtag&hashtag=${encodeURIComponent(seed.tag)}`,
          {
            headers: {
              'Authorization':              `Bearer ${accessToken}`,
              'LinkedIn-Version':           '202608',
              'X-Restli-Protocol-Version':  '2.0.0',
            },
          },
        );
        const data = await res.json() as any;
        if (res.status === 403 || res.status === 401) {
          // Community Management API not yet approved for this LinkedIn app.
          // Apply at: https://developer.linkedin.com → your app → Products → Community Management API
          this.logger.warn('Trends: LinkedIn hashtag API requires Community Management API product approval. Skipping.');
          return { refreshed: 0, errors: [] };
        }
        if (!res.ok) throw new Error(data.message ?? data.serviceErrorCode ?? `HTTP ${res.status}`);

        const followersCount: number = data.followersCount ?? 0;

        const existing = await this.prisma.trendCache.findUnique({
          where: { brandId_platform_tag: { brandId, platform: 'LinkedIn', tag: `#${seed.tag}` } },
        });
        const shouldRotate = !existing
          || (Date.now() - existing.updatedAt.getTime()) > 23 * ONE_HOUR_MS;

        await this.prisma.trendCache.upsert({
          where:  { brandId_platform_tag: { brandId, platform: 'LinkedIn', tag: `#${seed.tag}` } },
          create: { brandId, platform: 'LinkedIn', tag: `#${seed.tag}`, category: seed.category, mediaCount: followersCount, prevCount: followersCount },
          update: {
            prevCount: shouldRotate ? (existing?.mediaCount ?? followersCount) : (existing?.prevCount ?? followersCount),
            mediaCount: followersCount,
          },
        });

        refreshed++;
      } catch (err: any) {
        errors.push(`#${seed.tag}: ${err.message}`);
        this.logger.warn(`Trends: LI hashtag #${seed.tag} failed: ${err.message}`);
      }
    }

    return { refreshed, errors };
  }
}

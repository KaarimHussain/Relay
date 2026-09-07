import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Platform, CompetitorSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompetitorDto } from './dto/create-competitor.dto';
import { UpdateCompetitorDto } from './dto/update-competitor.dto';
import { decrypt } from '../common/crypto.util';
import { CompetitorDataProvider, PublicProfileStats } from './competitor-data.provider';

@Injectable()
export class CompetitorsService {
  private readonly logger = new Logger(CompetitorsService.name);

  constructor(
    private prisma: PrismaService,
    private data: CompetitorDataProvider,
  ) {}

  private normalizeHandle(handle: string): string {
    return handle.trim().replace(/^@/, '').replace(/\/+$/, '');
  }

  async list(brandId: string) {
    return this.prisma.competitor.findMany({
      where: { brandId },
      orderBy: [{ platform: 'asc' }, { followerCount: 'desc' }],
    });
  }

  async create(brandId: string, dto: CreateCompetitorDto) {
    const handle = this.normalizeHandle(dto.handle);
    if (!handle) throw new BadRequestException('A competitor handle is required.');

    const existing = await this.prisma.competitor.findUnique({
      where: { brandId_platform_handle: { brandId, platform: dto.platform, handle } },
    });
    if (existing) throw new BadRequestException(`@${handle} is already tracked on ${dto.platform}.`);

    // If no manual numbers were supplied, try to pull real public stats live.
    // On any failure we fall back to manual values (often zeros).
    let live: { stats: PublicProfileStats; source: CompetitorSource } | null = null;
    const manualProvided = dto.followerCount != null || dto.avgLikes != null || dto.avgComments != null;
    if (!manualProvided && this.data.isConfigured(dto.platform)) {
      live = await this.fetchLive(brandId, dto.platform, handle).catch((e) => {
        this.logger.warn(`Live lookup failed for ${dto.platform} @${handle}: ${e.message}`);
        return null;
      });
    }
    const stats = live?.stats ?? null;

    return this.prisma.competitor.create({
      data: {
        brandId,
        platform: dto.platform,
        handle,
        displayName: stats?.displayName ?? dto.displayName ?? null,
        avatarUrl: stats?.avatarUrl ?? null,
        followerCount: stats?.followerCount ?? dto.followerCount ?? 0,
        mediaCount: stats?.mediaCount ?? 0,
        avgLikes: stats?.avgLikes ?? dto.avgLikes ?? 0,
        avgComments: stats?.avgComments ?? dto.avgComments ?? 0,
        postsPerWeek: stats?.postsPerWeek ?? dto.postsPerWeek ?? 0,
        source: live?.source ?? 'Manual',
        lastSyncedAt: stats ? new Date() : null,
      },
    });
  }

  /**
   * Fetch a competitor's public stats live. Instagram prefers Meta's official
   * Business Discovery API (via the brand's connected IG business account) — free,
   * reliable, no App Review. Falls back to public scraping / RapidAPI otherwise.
   */
  private async fetchLive(
    brandId: string,
    platform: Platform,
    handle: string,
  ): Promise<{ stats: PublicProfileStats; source: CompetitorSource }> {
    if (platform === Platform.Instagram) {
      const igAccount = await this.prisma.socialAccount.findFirst({
        where: { brandId, platform: Platform.Instagram, status: 'Active' },
        select: { platformUserId: true, accessToken: true },
      });
      if (igAccount) {
        try {
          const token = decrypt(igAccount.accessToken);
          const stats = await this.data.fetchInstagramBusinessDiscovery(igAccount.platformUserId, token, handle);
          return { stats, source: CompetitorSource.InstagramApi };
        } catch (e: any) {
          this.logger.warn(`Business Discovery failed for @${handle}, trying public fallback: ${e.message}`);
        }
      }
    }
    // Public scraping (IG) or RapidAPI (X/TikTok when a key is set).
    const stats = await this.data.fetchProfile(platform, handle);
    return { stats, source: CompetitorSource.RapidApi };
  }

  async update(brandId: string, id: string, dto: UpdateCompetitorDto) {
    await this.getOwned(brandId, id);
    return this.prisma.competitor.update({
      where: { id },
      // Manual edits flip the source back to Manual so it's clear the numbers were hand-set.
      data: { ...dto, source: 'Manual' },
    });
  }

  async remove(brandId: string, id: string) {
    await this.getOwned(brandId, id);
    await this.prisma.competitor.delete({ where: { id } });
    return { id, deleted: true };
  }

  /** Re-pull live public stats for a single competitor (Business Discovery / scraper). */
  async sync(brandId: string, id: string) {
    const competitor = await this.getOwned(brandId, id);
    if (!this.data.isConfigured(competitor.platform)) {
      throw new BadRequestException(
        `No live source is available for ${competitor.platform}. Edit this competitor's numbers manually.`,
      );
    }

    const { stats, source } = await this.fetchLive(brandId, competitor.platform, competitor.handle);
    return this.prisma.competitor.update({
      where: { id },
      data: {
        displayName: stats.displayName ?? competitor.displayName,
        avatarUrl: stats.avatarUrl ?? competitor.avatarUrl,
        followerCount: stats.followerCount,
        mediaCount: stats.mediaCount,
        avgLikes: stats.avgLikes,
        avgComments: stats.avgComments,
        postsPerWeek: stats.postsPerWeek,
        source,
        lastSyncedAt: new Date(),
      },
    });
  }

  /**
   * Side-by-side benchmark of the brand's own performance against tracked competitors
   * for one platform (defaults to Instagram, where scraper coverage is richest).
   */
  async compare(brandId: string, platform: Platform = Platform.Instagram) {
    const [self, competitors] = await Promise.all([
      this.selfBenchmark(brandId, platform),
      this.prisma.competitor.findMany({
        where: { brandId, platform },
        orderBy: { followerCount: 'desc' },
      }),
    ]);

    const withEngagement = competitors.map((c) => ({
      id: c.id,
      handle: c.handle,
      displayName: c.displayName,
      avatarUrl: c.avatarUrl,
      followerCount: c.followerCount,
      avgLikes: c.avgLikes,
      avgComments: c.avgComments,
      postsPerWeek: c.postsPerWeek,
      engagementRate: engagementRate(c.avgLikes + c.avgComments, c.followerCount),
      source: c.source,
      lastSyncedAt: c.lastSyncedAt,
    }));

    return { platform, scraperReady: this.data.isConfigured(platform), self, competitors: withEngagement };
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private async getOwned(brandId: string, id: string) {
    const competitor = await this.prisma.competitor.findFirst({ where: { id, brandId } });
    if (!competitor) throw new NotFoundException('Competitor not found.');
    return competitor;
  }

  /** Own IG follower count via the connected account's own token — reliable, no scraping. */
  private async fetchOwnInstagramFollowers(igUserId: string, encryptedToken: string): Promise<number> {
    const token = decrypt(encryptedToken);
    const res = await fetch(`https://graph.facebook.com/v21.0/${igUserId}?fields=followers_count&access_token=${token}`);
    const data = await res.json() as any;
    if (data.error) throw new Error(data.error.message);
    return data.followers_count ?? 0;
  }

  /** The brand's own numbers for a platform, shaped to match a competitor row. */
  private async selfBenchmark(brandId: string, platform: Platform) {
    // Latest snapshot per published target on this platform → average engagement per post.
    const snapshots = await this.prisma.analyticsSnapshot.findMany({
      where: { target: { post: { brandId }, account: { platform } } },
      orderBy: { takenAt: 'asc' },
    });
    const latestByTarget = new Map<string, (typeof snapshots)[number]>();
    for (const s of snapshots) latestByTarget.set(s.targetId, s);
    const latest = [...latestByTarget.values()];

    const postCount = latest.length;
    const avgLikes = postCount ? Math.round(latest.reduce((a, s) => a + s.likes, 0) / postCount) : 0;
    const avgComments = postCount ? Math.round(latest.reduce((a, s) => a + s.comments, 0) / postCount) : 0;

    // Posting cadence over the last 8 weeks of published posts on this platform.
    const eightWeeksAgo = new Date(Date.now() - 8 * 7 * 86_400_000);
    const recentPosts = await this.prisma.postPlatformTarget.count({
      where: {
        status: 'Published',
        publishedAt: { gte: eightWeeksAgo },
        post: { brandId },
        account: { platform },
      },
    });
    const postsPerWeek = Math.round((recentPosts / 8) * 10) / 10;

    // Own follower count comes from the connected account's own token (reliable) —
    // we never scrape our own profile.
    const account = await this.prisma.socialAccount.findFirst({
      where: { brandId, platform, status: 'Active' },
      select: { platformHandle: true, platformUserId: true, accessToken: true },
    });
    let followerCount = 0;
    if (account && platform === Platform.Instagram) {
      followerCount = await this.fetchOwnInstagramFollowers(account.platformUserId, account.accessToken)
        .catch(() => 0);
    }

    return {
      handle: account?.platformHandle ?? 'You',
      followerCount,
      avgLikes,
      avgComments,
      postsPerWeek,
      engagementRate: engagementRate(avgLikes + avgComments, followerCount),
      isSelf: true as const,
    };
  }
}

/** Standard IG-style engagement rate: engagement per post ÷ followers, as a %. */
function engagementRate(engagementPerPost: number, followers: number): number {
  if (followers <= 0) return 0;
  return Math.round((engagementPerPost / followers) * 100 * 100) / 100;
}

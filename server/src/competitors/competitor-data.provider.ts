import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Platform } from '@prisma/client';

/** Public metrics for a competitor. Reach/impressions are never public. */
export interface PublicProfileStats {
  displayName?: string;
  avatarUrl?: string;
  followerCount: number;
  mediaCount: number;
  avgLikes: number;
  avgComments: number;
  postsPerWeek: number;
}

// Optional RapidAPI hosts — only used if RAPIDAPI_KEY is set. Free scraping is tried first.
const RAPID_HOSTS: Partial<Record<Platform, string>> = {
  Instagram: 'instagram-scraper-api2.p.rapidapi.com',
  TikTok: 'tiktok-scraper7.p.rapidapi.com',
  X: 'twitter-api45.p.rapidapi.com',
};

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

@Injectable()
export class CompetitorDataProvider {
  private readonly logger = new Logger(CompetitorDataProvider.name);

  private get rapidKey(): string {
    return process.env.RAPIDAPI_KEY ?? '';
  }

  private rapidHostFor(platform: Platform): string | null {
    const override = process.env[`RAPIDAPI_${platform.toUpperCase()}_HOST`];
    return override || RAPID_HOSTS[platform] || null;
  }

  /** Platforms we can fetch for FREE (no key). Instagram's public web endpoint works. */
  private freeSupported(platform: Platform): boolean {
    return platform === Platform.Instagram;
  }

  /** True when there's any live source for this platform — free or via RapidAPI key. */
  isConfigured(platform: Platform): boolean {
    return this.freeSupported(platform) || Boolean(this.rapidKey && this.rapidHostFor(platform));
  }

  async fetchProfile(platform: Platform, handle: string): Promise<PublicProfileStats> {
    // Free path first — no key, no cost.
    if (this.freeSupported(platform)) {
      try {
        if (platform === Platform.Instagram) return await this.fetchInstagramFree(handle);
      } catch (e: any) {
        const canFallBack = this.rapidKey && this.rapidHostFor(platform);
        this.logger.warn(`Free lookup failed for ${platform} @${handle}: ${e.message}`);
        if (!canFallBack) throw e;
      }
    }

    // Optional RapidAPI fallback (or platforms with no free source).
    const host = this.rapidHostFor(platform);
    if (this.rapidKey && host) return this.fetchViaRapid(platform, host, handle);

    throw new BadRequestException(
      `No free live source for ${platform} — enter this competitor's numbers manually.`,
    );
  }

  // ── Instagram Business Discovery (OFFICIAL, free, reliable) ───────────────────

  /**
   * Meta's Business Discovery API — returns PUBLIC data about any professional IG
   * account by username, queried THROUGH the brand's own connected IG business
   * account. Works in Development Mode (no App Review) because the querying account
   * has a role on the app. Reach/impressions are never returned for others.
   *
   * @param igBusinessId the brand's own IG business account id (SocialAccount.platformUserId)
   * @param accessToken  the brand's own Page token (decrypted SocialAccount.accessToken)
   */
  async fetchInstagramBusinessDiscovery(
    igBusinessId: string,
    accessToken: string,
    handle: string,
  ): Promise<PublicProfileStats> {
    const fields =
      `business_discovery.username(${handle})` +
      `{followers_count,media_count,name,profile_picture_url,` +
      `media.limit(25){like_count,comments_count,timestamp}}`;
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${igBusinessId}` +
        `?fields=${encodeURIComponent(fields)}&access_token=${accessToken}`,
    );
    const data = (await res.json()) as any;
    if (data.error) {
      throw new BadRequestException(
        data.error.message ??
          `Couldn't look up @${handle}. It must be a public Instagram business/creator account.`,
      );
    }
    const bd = data.business_discovery;
    if (!bd) throw new BadRequestException(`No public Instagram data found for @${handle}.`);

    const media: any[] = arr(bd.media?.data);
    const sample = media.length;
    const avgLikes = sample ? Math.round(media.reduce((a, m) => a + num(m.like_count), 0) / sample) : 0;
    const avgComments = sample ? Math.round(media.reduce((a, m) => a + num(m.comments_count), 0) / sample) : 0;
    const times = media
      .map((m) => (m.timestamp ? Date.parse(m.timestamp) : NaN))
      .filter((t) => !Number.isNaN(t))
      .sort((a, b) => a - b);

    return {
      displayName: str(bd.name),
      avatarUrl: str(bd.profile_picture_url),
      followerCount: num(bd.followers_count),
      mediaCount: num(bd.media_count),
      avgLikes,
      avgComments,
      postsPerWeek: postsPerWeekFromTimes(times),
    };
  }

  // ── Free Instagram (public web profile endpoint, no auth) ─────────────────────

  private async fetchInstagramFree(handle: string): Promise<PublicProfileStats> {
    // Mirror what instagram.com's own web client sends — a bare x-ig-app-id + UA now
    // gets 400'd, so we include the referer/origin/ASBD headers the site uses.
    const res = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`,
      {
        headers: {
          'User-Agent': BROWSER_UA,
          'x-ig-app-id': '936619743392459',
          'X-ASBD-ID': '129477',
          'X-IG-WWW-Claim': '0',
          'X-Requested-With': 'XMLHttpRequest',
          Referer: `https://www.instagram.com/${encodeURIComponent(handle)}/`,
          Origin: 'https://www.instagram.com',
          Accept: '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
    );

    if (res.status === 404) throw new BadRequestException(`Instagram user @${handle} not found.`);
    if (res.status === 429) {
      throw new BadRequestException('Instagram is rate-limiting requests right now — wait a minute and retry, or enter numbers manually.');
    }
    if (!res.ok) {
      throw new BadRequestException(`Instagram blocked the lookup (HTTP ${res.status}). Retry shortly or enter numbers manually.`);
    }

    let json: any;
    try { json = JSON.parse(await res.text()); } catch {
      throw new BadRequestException('Instagram returned an unexpected response — retry shortly or enter numbers manually.');
    }

    const user = json?.data?.user;
    if (!user) throw new BadRequestException(`No public data found for @${handle}.`);
    if (user.is_private) throw new BadRequestException(`@${handle} is a private account — no public metrics available.`);

    const media = user.edge_owner_to_timeline_media;
    const nodes = arr(media?.edges).map((e: any) => e?.node).filter(Boolean);
    const sample = nodes.length;
    const avgLikes = sample
      ? Math.round(nodes.reduce((a, n) => a + num(n.edge_liked_by ?? n.edge_media_preview_like), 0) / sample)
      : 0;
    const avgComments = sample
      ? Math.round(nodes.reduce((a, n) => a + num(n.edge_media_to_comment), 0) / sample)
      : 0;

    const times = nodes
      .map((n) => (typeof n.taken_at_timestamp === 'number' ? n.taken_at_timestamp * 1000 : NaN))
      .filter((t) => !Number.isNaN(t))
      .sort((a, b) => a - b);

    return {
      displayName: str(user.full_name),
      avatarUrl: str(user.profile_pic_url_hd ?? user.profile_pic_url),
      followerCount: num(user.edge_followed_by),
      mediaCount: num(media?.count),
      avgLikes,
      avgComments,
      postsPerWeek: postsPerWeekFromTimes(times),
    };
  }

  // ── Optional RapidAPI paths (only when RAPIDAPI_KEY is set) ────────────────────

  private async rapidGet(host: string, path: string): Promise<any> {
    const res = await fetch(`https://${host}${path}`, {
      headers: { 'x-rapidapi-key': this.rapidKey, 'x-rapidapi-host': host },
    });
    const text = await res.text();
    let json: any;
    try { json = JSON.parse(text); } catch {
      throw new BadRequestException(`Scraper returned a non-JSON response (HTTP ${res.status}).`);
    }
    if (!res.ok) {
      const msg = json?.message || json?.error || json?.detail || `Scraper error (HTTP ${res.status}).`;
      throw new BadRequestException(typeof msg === 'string' ? msg : `Scraper error (HTTP ${res.status}).`);
    }
    return json;
  }

  private fetchViaRapid(platform: Platform, host: string, handle: string): Promise<PublicProfileStats> {
    switch (platform) {
      case Platform.Instagram: return this.rapidInstagram(host, handle);
      case Platform.TikTok:    return this.rapidTikTok(host, handle);
      case Platform.X:         return this.rapidTwitter(host, handle);
      default:
        throw new BadRequestException(`Live lookup isn't wired up for ${platform} — enter numbers manually.`);
    }
  }

  private async rapidInstagram(host: string, handle: string): Promise<PublicProfileStats> {
    const info = await this.rapidGet(host, `/v1/info?username_or_id_or_url=${encodeURIComponent(handle)}`);
    const d = info?.data ?? info?.user ?? info;
    const posts = await this.rapidGet(host, `/v1/posts?username_or_id_or_url=${encodeURIComponent(handle)}`).catch(() => null);
    const items = arr(posts?.data?.items ?? posts?.items ?? posts?.data);
    return {
      displayName: str(pick(d, ['full_name', 'name'])),
      avatarUrl: str(pick(d, ['profile_pic_url', 'profile_pic_url_hd', 'avatar'])),
      followerCount: num(pick(d, ['follower_count', 'followers_count', 'followers', 'edge_followed_by'])),
      mediaCount: num(pick(d, ['media_count', 'medias_count', 'posts_count'])),
      ...engagementFrom(items, ['like_count', 'likes_count', 'likes'], ['comment_count', 'comments_count', 'comments'], ['taken_at', 'taken_at_timestamp', 'timestamp']),
    };
  }

  private async rapidTikTok(host: string, handle: string): Promise<PublicProfileStats> {
    const info = await this.rapidGet(host, `/user/info?unique_id=${encodeURIComponent(handle)}`);
    const stats = info?.data?.stats ?? info?.stats ?? info?.data ?? info;
    const user = info?.data?.user ?? info?.user ?? info?.data ?? info;
    const posts = await this.rapidGet(host, `/user/posts?unique_id=${encodeURIComponent(handle)}&count=30`).catch(() => null);
    const items = arr(posts?.data?.videos ?? posts?.data?.itemList ?? posts?.videos ?? posts?.data);
    return {
      displayName: str(pick(user, ['nickname', 'name', 'unique_id'])),
      avatarUrl: str(pick(user, ['avatarLarger', 'avatarMedium', 'avatar'])),
      followerCount: num(pick(stats, ['followerCount', 'follower_count', 'followers'])),
      mediaCount: num(pick(stats, ['videoCount', 'video_count', 'aweme_count'])),
      ...engagementFrom(items, ['digg_count', 'diggCount', 'like_count'], ['comment_count', 'commentCount'], ['create_time', 'createTime', 'timestamp']),
    };
  }

  private async rapidTwitter(host: string, handle: string): Promise<PublicProfileStats> {
    const info = await this.rapidGet(host, `/screenname.php?screenname=${encodeURIComponent(handle)}`);
    const d = info?.data ?? info;
    const timeline = await this.rapidGet(host, `/timeline.php?screenname=${encodeURIComponent(handle)}`).catch(() => null);
    const items = arr(timeline?.timeline ?? timeline?.data ?? timeline?.tweets);
    return {
      displayName: str(pick(d, ['name', 'displayname', 'display_name'])),
      avatarUrl: str(pick(d, ['avatar', 'profile_image', 'profile_image_url_https'])),
      followerCount: num(pick(d, ['followers_count', 'followers', 'sub_count'])),
      mediaCount: num(pick(d, ['statuses_count', 'statusesCount', 'tweets'])),
      ...engagementFrom(items, ['favorites', 'favorite_count', 'likes'], ['replies', 'reply_count', 'comments'], ['created_at', 'timestamp', 'date']),
    };
  }
}

// ── Tolerant field helpers — scraper schemas vary, so we probe several key names ──

function pick(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
}

function num(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') { const n = Number(v.replace(/[^0-9.]/g, '')); return Number.isNaN(n) ? 0 : n; }
  if (typeof v === 'object') return num(v.count ?? v.value ?? 0);
  return 0;
}

function str(v: any): string | undefined {
  return typeof v === 'string' && v.length ? v : undefined;
}

function arr(v: any): any[] {
  return Array.isArray(v) ? v : [];
}

function engagementFrom(items: any[], likeKeys: string[], commentKeys: string[], timeKeys: string[]) {
  const sample = items.length;
  const avgLikes = sample ? Math.round(items.reduce((a, it) => a + num(pick(it, likeKeys)), 0) / sample) : 0;
  const avgComments = sample ? Math.round(items.reduce((a, it) => a + num(pick(it, commentKeys)), 0) / sample) : 0;
  const times = items
    .map((it) => toMillis(pick(it, timeKeys)))
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b);
  return { avgLikes, avgComments, postsPerWeek: postsPerWeekFromTimes(times) };
}

/** Estimate weekly posting cadence from sorted post timestamps (millis). */
function postsPerWeekFromTimes(times: number[]): number {
  if (times.length < 2) return 0;
  const spanWeeks = (times[times.length - 1] - times[0]) / (7 * 86_400_000);
  return spanWeeks <= 0 ? times.length : Math.round(((times.length - 1) / spanWeeks) * 10) / 10;
}

/** Coerce a unix-seconds / unix-millis / ISO timestamp to millis. */
function toMillis(v: any): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v < 1e12 ? v * 1000 : v;
  if (typeof v === 'string') {
    const asNum = Number(v);
    if (!Number.isNaN(asNum)) return asNum < 1e12 ? asNum * 1000 : asNum;
    const parsed = Date.parse(v);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

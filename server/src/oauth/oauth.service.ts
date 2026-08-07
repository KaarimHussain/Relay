import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountsService } from '../accounts/accounts.service';
import * as crypto from 'crypto';

interface OAuthState {
  userId: string;
  brandId: string;
  platform: string;
  codeVerifier?: string;   // X PKCE only
  expiresAt: number;
}

@Injectable()
export class OAuthService {
  // In-memory state store — fine for single-instance; replace with Redis for multi-instance
  private readonly states = new Map<string, OAuthState>();

  constructor(
    private config: ConfigService,
    private accounts: AccountsService,
  ) {
    // Clean up expired states every 5 min
    setInterval(() => {
      const now = Date.now();
      for (const [k, v] of this.states) {
        if (v.expiresAt < now) this.states.delete(k);
      }
    }, 5 * 60 * 1000);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private serverUrl()   { return this.config.get('SERVER_URL',   'http://localhost:3001'); }
  private frontendUrl() { return this.config.get('FRONTEND_URL', 'http://localhost:3000'); }
  private callbackUrl(platform: string) {
    return `${this.serverUrl()}/api/v1/oauth/callback/${platform.toLowerCase()}`;
  }

  private newState(data: Omit<OAuthState, 'expiresAt'>): string {
    const state = crypto.randomBytes(20).toString('hex');
    this.states.set(state, { ...data, expiresAt: Date.now() + 10 * 60 * 1000 });
    return state;
  }

  private consumeState(state: string): OAuthState {
    const data = this.states.get(state);
    if (!data) throw new UnauthorizedException('Invalid or expired OAuth state');
    if (data.expiresAt < Date.now()) {
      this.states.delete(state);
      throw new UnauthorizedException('OAuth state expired — please try again');
    }
    this.states.delete(state);
    return data;
  }

  private b64url(buf: Buffer) {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  // ─── Build connect URLs ────────────────────────────────────────────────────

  buildConnectUrl(platform: string, userId: string, brandId: string): string {
    switch (platform.toLowerCase()) {
      case 'facebook':
      case 'instagram':
        return this.facebookConnectUrl(platform, userId, brandId);
      case 'linkedin':
        return this.linkedinConnectUrl(userId, brandId);
      case 'x':
        return this.xConnectUrl(userId, brandId);
      case 'tiktok':
        return this.tiktokConnectUrl(userId, brandId);
      default:
        throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
  }

  private facebookConnectUrl(platform: string, userId: string, brandId: string): string {
    const state = this.newState({ userId, brandId, platform });
    const params = new URLSearchParams({
      client_id:     this.config.getOrThrow('FACEBOOK_APP_ID'),
      redirect_uri:  this.callbackUrl('facebook'),
      scope:         'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,instagram_manage_insights,instagram_manage_comments',
      state,
      response_type: 'code',
    });
    return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
  }

  private linkedinConnectUrl(userId: string, brandId: string): string {
    const state = this.newState({ userId, brandId, platform: 'linkedin' });
    const params = new URLSearchParams({
      response_type: 'code',
      client_id:     this.config.getOrThrow('LINKEDIN_CLIENT_ID'),
      redirect_uri:  this.callbackUrl('linkedin'),
      scope:         'openid profile w_member_social r_organization_social',
      state,
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  }

  private xConnectUrl(userId: string, brandId: string): string {
    const codeVerifier  = this.b64url(crypto.randomBytes(32));
    const codeChallenge = this.b64url(
      crypto.createHash('sha256').update(codeVerifier).digest(),
    );
    const state = this.newState({ userId, brandId, platform: 'x', codeVerifier });
    const params = new URLSearchParams({
      response_type:         'code',
      client_id:             this.config.getOrThrow('TWITTER_CLIENT_ID'),
      redirect_uri:          this.callbackUrl('x'),
      scope:                 'tweet.write tweet.read users.read media.write offline.access',
      state,
      code_challenge:        codeChallenge,
      code_challenge_method: 'S256',
    });
    return `https://twitter.com/i/oauth2/authorize?${params}`;
  }

  private tiktokConnectUrl(userId: string, brandId: string): string {
    const state = this.newState({ userId, brandId, platform: 'tiktok' });
    const params = new URLSearchParams({
      client_key:    this.config.getOrThrow('TIKTOK_CLIENT_KEY'),
      redirect_uri:  this.callbackUrl('tiktok'),
      response_type: 'code',
      scope:         'user.info.basic,video.publish,video.upload',
      state,
    });
    return `https://www.tiktok.com/v2/auth/authorize?${params}`;
  }

  // ─── Handle callbacks ──────────────────────────────────────────────────────

  async handleCallback(platform: string, code: string, state: string): Promise<string> {
    const stateData = this.consumeState(state);
    const { userId, brandId } = stateData;

    try {
      switch (platform.toLowerCase()) {
        case 'facebook':
          await this.handleFacebookCallback(code, userId, brandId, stateData.platform);
          break;
        case 'linkedin':
          await this.handleLinkedInCallback(code, userId, brandId);
          break;
        case 'x':
          await this.handleXCallback(code, stateData.codeVerifier!, userId, brandId);
          break;
        case 'tiktok':
          await this.handleTikTokCallback(code, userId, brandId);
          break;
        default:
          throw new BadRequestException(`Unsupported platform: ${platform}`);
      }
    } catch (err: any) {
      const msg = encodeURIComponent(err.message ?? 'OAuth failed');
      return `${this.frontendUrl()}/accounts?error=${msg}`;
    }

    // Capitalise first letter so the banner reads "Instagram connected" not "instagram connected"
    const displayPlatform = stateData.platform.charAt(0).toUpperCase() + stateData.platform.slice(1);
    return `${this.frontendUrl()}/accounts?connected=${encodeURIComponent(displayPlatform)}`;
  }

  // ─── Facebook / Instagram ──────────────────────────────────────────────────

  private async handleFacebookCallback(
    code: string,
    userId: string,
    brandId: string,
    originalPlatform: string,
  ) {
    // Exchange code for user access token
    const tokenRes = await fetch('https://graph.facebook.com/v21.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     this.config.get('FACEBOOK_APP_ID')!,
        client_secret: this.config.get('FACEBOOK_APP_SECRET')!,
        redirect_uri:  this.callbackUrl('facebook'),
        code,
      }),
    });
    const tokenData = await tokenRes.json() as any;
    if (tokenData.error) throw new Error(tokenData.error.message);
    const userToken: string = tokenData.access_token;

    // Get long-lived token (60 days)
    const llRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${this.config.get('FACEBOOK_APP_ID')}&client_secret=${this.config.get('FACEBOOK_APP_SECRET')}&fb_exchange_token=${userToken}`
    );
    const llData = await llRes.json() as any;
    const longToken: string = llData.access_token ?? userToken;

    // Get user's Facebook Pages (each page has its own long-lived token)
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${longToken}`
    );
    const pagesData = await pagesRes.json() as any;
    if (pagesData.error) throw new Error(pagesData.error.message);

    const pages: Array<{ id: string; name: string; access_token: string; instagram_business_account?: { id: string } }> =
      pagesData.data ?? [];

    if (!pages.length) throw new Error('No Facebook Pages found. Create a Page first and try again.');

    if (originalPlatform.toLowerCase() === 'instagram') {
      // ── Instagram flow: only save Instagram Business accounts found on pages ──
      let savedCount = 0;
      for (const page of pages) {
        if (!page.instagram_business_account?.id) continue;

        const igId = page.instagram_business_account.id;
        const igRes = await fetch(
          `https://graph.facebook.com/v21.0/${igId}?fields=username&access_token=${page.access_token}`
        );
        const igData = await igRes.json() as any;
        await this.accounts.connect(brandId, {
          platform:       'Instagram',
          platformUserId: igId,
          platformHandle: `@${igData.username ?? igId}`,
          accessToken:    page.access_token,
        });
        savedCount++;
      }

      if (savedCount === 0) {
        throw new Error(
          'No Instagram Business account found linked to your Facebook Pages. ' +
          'Go to your Facebook Page → Settings → Linked Accounts and connect your Instagram account first, then try again.',
        );
      }
    } else {
      // ── Facebook flow: save each Facebook Page as a separate account ──
      for (const page of pages) {
        await this.accounts.connect(brandId, {
          platform:       'Facebook',
          platformUserId: page.id,
          platformHandle: page.name,
          accessToken:    page.access_token,
        });
      }
    }
  }

  // ─── LinkedIn ──────────────────────────────────────────────────────────────

  private async handleLinkedInCallback(code: string, userId: string, brandId: string) {
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  this.callbackUrl('linkedin'),
        client_id:     this.config.get('LINKEDIN_CLIENT_ID')!,
        client_secret: this.config.get('LINKEDIN_CLIENT_SECRET')!,
      }),
    });
    const tokenData = await tokenRes.json() as any;
    if (tokenData.error) throw new Error(tokenData.error_description ?? tokenData.error);

    const accessToken: string = tokenData.access_token;
    const expiresIn: number   = tokenData.expires_in ?? 5183999; // ~60 days default

    // Get profile via OpenID userinfo
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await profileRes.json() as any;

    await this.accounts.connect(brandId, {
      platform:        'LinkedIn',
      platformUserId:  profile.sub,
      platformHandle:  profile.name ?? profile.email ?? profile.sub,
      accessToken,
      tokenExpiresAt:  new Date(Date.now() + expiresIn * 1000).toISOString(),
    });
  }

  // ─── X (Twitter) ──────────────────────────────────────────────────────────

  private async handleXCallback(
    code: string,
    codeVerifier: string,
    userId: string,
    brandId: string,
  ) {
    const credentials = Buffer.from(
      `${this.config.get('TWITTER_CLIENT_ID')}:${this.config.get('TWITTER_CLIENT_SECRET')}`
    ).toString('base64');

    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        Authorization:   `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  this.callbackUrl('x'),
        code_verifier: codeVerifier,
      }),
    });
    const tokenData = await tokenRes.json() as any;
    if (tokenData.error) throw new Error(tokenData.error_description ?? tokenData.error);

    const accessToken:  string = tokenData.access_token;
    const refreshToken: string = tokenData.refresh_token;
    const expiresIn:    number = tokenData.expires_in ?? 7200;

    // Get user profile
    const meRes = await fetch('https://api.twitter.com/2/users/me?user.fields=username,name', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meData = await meRes.json() as any;
    const xUser = meData.data;

    await this.accounts.connect(brandId, {
      platform:        'X',
      platformUserId:  xUser.id,
      platformHandle:  `@${xUser.username}`,
      accessToken,
      refreshToken,
      tokenExpiresAt:  new Date(Date.now() + expiresIn * 1000).toISOString(),
    });
  }

  // ─── TikTok ────────────────────────────────────────────────────────────────

  private async handleTikTokCallback(code: string, userId: string, brandId: string) {
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key:    this.config.get('TIKTOK_CLIENT_KEY')!,
        client_secret: this.config.get('TIKTOK_CLIENT_SECRET')!,
        code,
        grant_type:    'authorization_code',
        redirect_uri:  this.callbackUrl('tiktok'),
      }),
    });
    const tokenData = await tokenRes.json() as any;
    if (tokenData.error) throw new Error(tokenData.error_description ?? tokenData.error);

    const accessToken:  string = tokenData.access_token;
    const refreshToken: string = tokenData.refresh_token;
    const expiresIn:    number = tokenData.expires_in ?? 86400;
    const openId:       string = tokenData.open_id;

    // Get display name
    const userRes = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const userData = await userRes.json() as any;
    const displayName: string = userData.data?.user?.display_name ?? openId;

    await this.accounts.connect(brandId, {
      platform:        'TikTok',
      platformUserId:  openId,
      platformHandle:  displayName,
      accessToken,
      refreshToken,
      tokenExpiresAt:  new Date(Date.now() + expiresIn * 1000).toISOString(),
    });
  }
}

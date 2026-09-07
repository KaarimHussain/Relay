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

interface LinkedInPending {
  userId: string;
  brandId: string;
  accessToken: string;
  tokenExpiresAt: Date;
  person: { id: string; name: string };
  orgs: Array<{ id: string; name: string }>;
  expiresAt: number;
}

@Injectable()
export class OAuthService {
  private readonly states = new Map<string, OAuthState>();
  private readonly linkedinPending = new Map<string, LinkedInPending>();

  constructor(
    private config: ConfigService,
    private accounts: AccountsService,
  ) {
    setInterval(() => {
      const now = Date.now();
      for (const [k, v] of this.states) {
        if (v.expiresAt < now) this.states.delete(k);
      }
      for (const [k, v] of this.linkedinPending) {
        if (v.expiresAt < now) this.linkedinPending.delete(k);
      }
    }, 5 * 60 * 1000);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private serverUrl()      { return this.config.get('SERVER_URL',   'http://localhost:3001'); }
  getFrontendUrl()         { return this.config.get('FRONTEND_URL', 'http://localhost:3000'); }
  private frontendUrl()    { return this.getFrontendUrl(); }
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
      scope:         'pages_show_list,pages_read_engagement,pages_read_user_content,pages_manage_posts,pages_manage_engagement,business_management,instagram_basic,instagram_content_publish,instagram_manage_insights,instagram_manage_comments',
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
      scope:         'openid profile w_member_social',
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
        case 'facebook': {
          await this.handleFacebookCallback(code, userId, brandId, stateData.platform);
          break;
        }
        case 'linkedin': {
          const tempId = await this.handleLinkedInCallback(code, userId, brandId);
          if (tempId !== null) {
            return `${this.frontendUrl()}/accounts?linkedin_pending=${tempId}`;
          }
          break;
        }
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

    type FbPage = { id: string; name: string; access_token: string; instagram_business_account?: { id: string } };

    // Get pages the user personally manages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&limit=100&access_token=${longToken}`
    );
    const pagesData = await pagesRes.json() as any;
    if (pagesData.error) throw new Error(pagesData.error.message);

    let pages: FbPage[] = pagesData.data ?? [];

    // Fallback: pages managed through Meta Business Portfolio won't appear in me/accounts.
    // Try fetching them via the Business Management API instead.
    if (!pages.length) {
      pages = await this.fetchBusinessPages(longToken);
    }

    if (!pages.length) {
      throw new Error(
        'No Facebook Pages found. Make sure you selected your Page when connecting ' +
        'and that you are an Admin of the Page.',
      );
    }

    if (originalPlatform.toLowerCase() === 'instagram') {
      // ── Instagram flow: fetch Instagram Business account per page ──
      let savedCount = 0;
      for (const page of pages) {
        const pageToken = await this.resolvePageToken(page.id, page.access_token, longToken);

        // With the instagram_basic scope granted, me/accounts already returns
        // instagram_business_account inline. Fall back to a direct page lookup
        // only if it wasn't included (e.g. field trimmed on the list response).
        let igId: string | undefined = page.instagram_business_account?.id;

        if (!igId) {
          const r = await fetch(
            `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${pageToken}`
          );
          const d = await r.json() as any;
          igId = d.instagram_business_account?.id;
        }

        if (!igId) continue;

        const igRes = await fetch(
          `https://graph.facebook.com/v21.0/${igId}?fields=username,name&access_token=${pageToken}`
        );
        const igData = await igRes.json() as any;
        const handle = igData.username ? `@${igData.username}` : (igData.name ?? igId);
        await this.accounts.connect(brandId, {
          platform:       'Instagram',
          platformUserId: igId,
          platformHandle: handle,
          accessToken:    pageToken,
        });
        savedCount++;
      }

      if (savedCount === 0) {
        throw new Error(
          'No Instagram Business account found. In your Facebook Page → Settings → Instagram, ' +
          'connect your Instagram account there first, then try again.',
        );
      }
    } else {
      // ── Facebook flow: save each Facebook Page as a separate account ──
      for (const page of pages) {
        // Reading a Page's post comments requires a genuine PAGE access token —
        // a user token yields "(#100) … requires pages_read_engagement". Pages
        // that come via the Business Portfolio fallback can arrive without a
        // usable token, so mint one explicitly.
        const pageToken = await this.resolvePageToken(page.id, page.access_token, longToken);
        await this.accounts.connect(brandId, {
          platform:       'Facebook',
          platformUserId: page.id,
          platformHandle: page.name,
          accessToken:    pageToken,
        });
      }
    }
  }

  /**
   * Returns a guaranteed Page access token. Prefers the token already attached
   * to the page; otherwise mints one from the (long-lived) user token, which
   * works whenever the user is an admin of the Page.
   */
  private async resolvePageToken(pageId: string, pageToken: string | undefined, userToken: string): Promise<string> {
    if (pageToken) return pageToken;
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=access_token&access_token=${userToken}`
    );
    const data = await res.json() as any;
    if (data.access_token) return data.access_token;
    // Last resort — the user token at least lets the account be saved; comment
    // reads may still fail until the user is made a direct Page admin.
    return userToken;
  }

  private async fetchBusinessPages(userToken: string): Promise<Array<{ id: string; name: string; access_token: string; instagram_business_account?: { id: string } }>> {
    const pages: Array<{ id: string; name: string; access_token: string; instagram_business_account?: { id: string } }> = [];
    try {
      const bizRes = await fetch(
        `https://graph.facebook.com/v21.0/me/businesses?fields=id,name&access_token=${userToken}`
      );
      const bizData = await bizRes.json() as any;
      if (bizData.error || !Array.isArray(bizData.data)) return pages;

      for (const business of bizData.data) {
        try {
          const pagesRes = await fetch(
            `https://graph.facebook.com/v21.0/${business.id}/owned_pages?fields=id,name,access_token,instagram_business_account&access_token=${userToken}`
          );
          const pData = await pagesRes.json() as any;
          if (!pData.error && Array.isArray(pData.data)) {
            pages.push(...pData.data);
          }
        } catch { /* skip this business */ }
      }
    } catch { /* network error */ }
    return pages;
  }

  // ─── LinkedIn ──────────────────────────────────────────────────────────────

  private async handleLinkedInCallback(code: string, userId: string, brandId: string): Promise<string | null> {
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
    const expiresIn: number   = tokenData.expires_in ?? 5183999;

    // LinkedIn v2 REST API requires these headers on every call
    const liHeaders = {
      Authorization:                `Bearer ${accessToken}`,
      'LinkedIn-Version':           '202608',
      'X-Restli-Protocol-Version':  '2.0.0',
    };

    // Get personal profile via OpenID userinfo (doesn't need version headers)
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await profileRes.json() as any;
    const personName: string = profile.name ?? profile.email ?? profile.sub;

    // Fetch organization pages this user can administer.
    // Requires Community Management API product on the LinkedIn app.
    const orgs: Array<{ id: string; name: string }> = [];
    try {
      const aclUrl =
        'https://api.linkedin.com/v2/organizationAcls' +
        '?q=roleAssignee' +
        '&count=10';
      const aclRes = await fetch(aclUrl, { headers: liHeaders });

      if (aclRes.ok) {
        const aclData = await aclRes.json() as any;
        const elements: any[] = aclData.elements ?? [];

        for (const el of elements) {
          const urn: string = el.organization ?? '';
          const orgId = urn.split(':').pop();
          if (!orgId) continue;

          // Try to fetch the org display name
          try {
            const orgRes = await fetch(
              `https://api.linkedin.com/v2/organizations/${orgId}?fields=localizedName`,
              { headers: liHeaders },
            );
            const orgData = orgRes.ok ? await orgRes.json() as any : {};
            orgs.push({ id: orgId, name: orgData.localizedName ?? orgId });
          } catch {
            orgs.push({ id: orgId, name: orgId });
          }
        }
      } else {
        const errText = await aclRes.text().catch(() => '');
        console.warn('[LinkedIn ACL] non-ok status:', aclRes.status, errText);
      }
    } catch {
      // Network or parse error — skip company pages, personal only
    }

    // No company pages — save personal profile immediately and return to normal flow
    if (orgs.length === 0) {
      await this.accounts.connect(brandId, {
        platform:       'LinkedIn',
        platformUserId: profile.sub,
        platformHandle: personName,
        accessToken,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      });
      return null;
    }

    // Company pages found — store for picker and return tempId
    const tempId = crypto.randomBytes(20).toString('hex');
    this.linkedinPending.set(tempId, {
      userId,
      brandId,
      accessToken,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      person: { id: profile.sub, name: personName },
      orgs,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    return tempId;
  }

  // ─── LinkedIn pending selection ────────────────────────────────────────────

  getLinkedInPending(tempId: string) {
    const pending = this.linkedinPending.get(tempId);
    if (!pending || pending.expiresAt < Date.now()) {
      this.linkedinPending.delete(tempId);
      throw new BadRequestException('Selection expired — please reconnect LinkedIn');
    }
    return { person: pending.person, orgs: pending.orgs };
  }

  async finalizeLinkedIn(tempId: string, selections: string[]) {
    const pending = this.linkedinPending.get(tempId);
    if (!pending || pending.expiresAt < Date.now()) {
      this.linkedinPending.delete(tempId);
      throw new BadRequestException('Selection expired — please reconnect LinkedIn');
    }
    this.linkedinPending.delete(tempId);

    const { brandId, accessToken, tokenExpiresAt, person, orgs } = pending;

    for (const sel of selections) {
      if (sel === 'person') {
        await this.accounts.connect(brandId, {
          platform:       'LinkedIn',
          platformUserId: person.id,
          platformHandle: person.name,
          accessToken,
          tokenExpiresAt: tokenExpiresAt.toISOString(),
        });
      } else {
        const org = orgs.find((o) => o.id === sel);
        if (!org) continue;
        await this.accounts.connect(brandId, {
          platform:       'LinkedIn',
          platformUserId: `org:${org.id}`,
          platformHandle: org.name,
          accessToken,
          tokenExpiresAt: tokenExpiresAt.toISOString(),
        });
      }
    }
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

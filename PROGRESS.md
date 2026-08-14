# Relay — Project Progress Status
> Last updated: 2026-08-13

## Project Overview
**Relay** is a social media scheduling SaaS built with:
- **Frontend**: Next.js 15 App Router, TypeScript, Tailwind CSS, Zustand
- **Backend**: NestJS, Prisma ORM, PostgreSQL
- **Auth**: JWT, OAuth2 (Facebook, Instagram, LinkedIn, X, TikTok)

---

## What's Been Built & Working

### Backend (NestJS — `server/`)
All 7 modules fully implemented and compiling clean:
- `auth` — JWT login/register, guards
- `brands` — multi-brand workspace management
- `accounts` — social account connect/disconnect/health check
- `posts` — post scheduling, CRUD
- `media` — media library upload/management
- `analytics` — analytics endpoints
- `ai` — AI studio endpoints

**OAuth (`server/src/oauth/`)**
- `oauth.service.ts` — full OAuth flows for all platforms
- `oauth.controller.ts` — REST endpoints for connect, callback, LinkedIn pending/finalize

### Frontend (Next.js — `client/`)
Pages implemented and wired to backend:
- Dashboard, Post Queue, Calendar, AI Studio, Analytics, Media Library
- **Accounts page** — redesigned as list/row layout (not cards), with:
  - Connected / Available sections with counts
  - Progress bar showing X/Y platforms active
  - Inline platform SVG icons (no lucide brand icons — they don't exist in v1.28.0)
  - LinkedIn Company Page modal (manual entry flow)
  - LinkedIn Picker modal (auto, when org pages found via ACL)

### Dev Setup
- **Single dev command**: `npm run dev` at project root starts both client + server via `concurrently`
- **`postinstall` script** in `server/package.json`: runs `prisma generate` automatically after `npm install` to prevent enum export errors

---

## OAuth Status Per Platform

### ✅ Facebook — WORKING
- Standard OAuth redirect flow (server-side, NOT JS SDK)
- Scopes: `pages_show_list, pages_read_engagement, pages_manage_posts, instagram_content_publish, instagram_manage_insights, instagram_manage_comments, business_management`
- `me/accounts` → gets pages user personally manages
- **Business Portfolio fallback**: if `me/accounts` returns empty, calls `me/businesses → owned_pages` to find pages managed through Meta Business Portfolio — **no modal, fully seamless**
- Redirect URI registered in Meta app: `http://localhost:3001/api/v1/oauth/callback/facebook`
- Meta app products needed: **Facebook Login** (Web, with redirect URI) + use cases for Pages + Instagram

### ⚠️ Instagram — BROKEN (debug in progress)
- Uses same Facebook OAuth flow (same callback, same token)
- The `instagram_business_account` field is NOT being returned by the Graph API for the page
- **Current state**: Added extensive debug logging (`[IG]` prefixed `console.log`) in `handleFacebookCallback` that tries 3 different methods to fetch `instagram_business_account`:
  1. Inline from `me/accounts` response
  2. Explicit `GET /{page-id}?fields=instagram_business_account` with page token
  3. Same with user token
  4. Nested fields syntax
- **Next step**: Run Instagram connect, capture the `[IG]` server logs, and diagnose why the field isn't returned
- Likely cause: Meta app missing `instagram_basic` permission OR Instagram account not properly linked to the Facebook Page in Meta's backend
- Instagram account IS a Business account (confirmed by user)

### ✅ LinkedIn — WORKING (personal profile)
- Scopes: `openid profile w_member_social` (removed `r_organization_social` and `w_organization_social` — both require Marketing Developer Platform which LinkedIn no longer grants)
- Personal profile connected via OpenID userinfo
- Company pages: fetched via `/v2/organizationAcls` — if found, shows LinkedIn Picker modal to select which accounts to connect
- Redirect URI: `http://localhost:3001/api/v1/oauth/callback/linkedin`
- LinkedIn app products needed: **Share on LinkedIn** + **Sign In with LinkedIn using OpenID Connect**

### 🔲 X (Twitter) — Implemented, untested
- PKCE flow, scopes: `tweet.write tweet.read users.read media.write offline.access`

### 🔲 TikTok — Implemented, untested

---

## Known Issues / Pending Work

### 1. Instagram `instagram_business_account` not returned (ACTIVE)
Debug logs added. Need to:
- Run Instagram connect and read `[IG]` server logs
- Determine if it's a permission issue (need `instagram_basic` on Meta app) or a page-linking issue
- Fix based on what logs show

**Files with debug logs to clean up after fix:**
- `server/src/oauth/oauth.service.ts` — `handleFacebookCallback` has multiple `console.log('[IG]'...)` calls

### 2. SMTP not configured
Forgot password email flow needs env vars:
```
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```
These are not yet set. The auth module likely has a forgot-password endpoint but emails won't send without these.

### 3. LinkedIn debug log still present
`server/src/oauth/oauth.service.ts` line ~341:
```typescript
console.warn('[LinkedIn ACL] non-ok status:', aclRes.status, errText);
```
This is fine to keep (it's a warn, not a log), but review before production.

---

## Key Architecture Decisions

| Decision | Reason |
|----------|--------|
| No lucide brand icons | lucide-react v1.28.0 has NO Facebook/LinkedIn/Instagram/Twitter icons — all use inline SVGs |
| Server-side OAuth only | Facebook JS SDK is browser-only; server-side gives full control |
| No unofficial npm Meta SDK | Poorly maintained, lags behind API versions |
| Business Portfolio fallback | `me/accounts` returns empty for Business Portfolio pages — fallback to `me/businesses/owned_pages` |
| LinkedIn modal for company pages | LinkedIn Community Management API requires manual selection when multiple orgs found |
| `postinstall: prisma generate` | Prevents 18 TypeScript errors about missing Prisma enum exports after fresh `npm install` |

---

## File Map (Key Files)

```
Relay/
├── package.json                          # Root: concurrently dev command
├── OAUTH_SETUP.md                        # Developer portal setup guide (LinkedIn, Meta, X, TikTok)
├── client/
│   ├── app/(dashboard)/
│   │   └── accounts/page.tsx             # Accounts page — list/row design, OAuth banners, LinkedIn picker
│   ├── components/
│   │   ├── queue/QueueView.tsx           # Post queue — thumbnail, SVG brand icons, compact layout
│   │   └── accounts/
│   │       ├── platforms.tsx             # Platform definitions (icon, color, name, description)
│   │       ├── PlatformCard.tsx          # PlatformDef type
│   │       └── ConnectGuideModal.tsx     # Guide modal for platforms needing setup steps
│   └── store/
│       ├── brand.ts                      # Zustand brand store
│       └── account.ts                    # Zustand account store
└── server/src/
    └── oauth/
        ├── oauth.service.ts              # All OAuth logic — Facebook/IG/LinkedIn/X/TikTok
        └── oauth.controller.ts           # Endpoints: connect, callback, linkedin pending/finalize
```

---

## Environment Variables Required

### Server (`server/.env`)
```
DATABASE_URL=
JWT_SECRET=
SERVER_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

SMTP_HOST=        # Not yet configured
SMTP_PORT=        # Not yet configured
SMTP_USER=        # Not yet configured
SMTP_PASS=        # Not yet configured
SMTP_FROM=        # Not yet configured
```

---

## Immediate Next Steps (Priority Order)

1. **Fix Instagram** — Run connect, read `[IG]` logs, diagnose and fix `instagram_business_account` field issue
2. **Clean up debug logs** in `oauth.service.ts` once Instagram is fixed
3. **Configure SMTP** for forgot-password emails
4. **Test X and TikTok** OAuth flows end-to-end
5. **Post scheduling** — verify posts actually publish to each connected platform

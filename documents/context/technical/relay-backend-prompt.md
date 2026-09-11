# Relay — Backend Build Prompt

Use this as the full context/spec to build the backend. Follow it as source of truth — don't introduce tech or patterns not listed here.

---

## 1. Product context

Relay is an SMM (social media management) automation agent. Core loop: user creates a **Brand** (acts as an organization/workspace) → connects social accounts to that brand → uploads human-made media → AI generates captions/hashtags → schedules and auto-publishes posts to connected platforms → tracks analytics.

Media (images/videos) is always human-made and uploaded by the user — the backend never generates or hosts AI image generation. AI is used only for text (captions, hashtags, content ideas).

Multi-tenant: a brand = an organization. A user can belong to multiple brands via membership with a role (Owner/Admin/Editor). All data (accounts, posts, media, analytics) is scoped to a brand, never global to a user.

---

## 2. Tech stack (use exactly this — do not substitute)

- **Framework**: NestJS (Node.js), modular architecture (one module per domain: auth, brands, accounts, posts, media, analytics, ai)
- **Database**: MySQL
- **ORM**: Prisma
- **Queue/Scheduling**: Redis + BullMQ — for scheduled post publishing, retries, and rate-limited API calls to social platforms
- **AI Inference**: OpenRouter, accessed via the OpenAI SDK (set `baseURL` to OpenRouter's endpoint, use OpenRouter API key). Must support structured output (JSON schema) and tool calling for caption/hashtag generation.
- **Auth**: Clerk or NextAuth (JWT-based session, brand-scoped authorization on top)
- **Media storage**: Cloudflare R2 or AWS S3 — signed upload URLs, backend never proxies file bytes directly
- **Frontend it talks to**: Next.js App Router (assume REST or tRPC-style API, confirm with frontend dev before finalizing contract)

---

## 3. Data model (already finalized — implement as-is via Prisma)

Entities: `User`, `Brand`, `Membership` (User↔Brand, with role), `SocialAccount` (belongs to Brand), `Post` (belongs to Brand), `Media` (belongs to Post, uploaded by User), `PostPlatformTarget` (one row per platform a Post is sent to — separate caption/hashtags/status/publish result per platform), `AnalyticsSnapshot` (time-series metrics per PostPlatformTarget).

Enums: `Platform` (Instagram, LinkedIn, X, Facebook, TikTok), `PostStatus` (Draft, Scheduled, Publishing, Published, Failed), `MemberRole` (Owner, Admin, Editor), `AccountStatus` (Active, Expired, Disconnected).

Full `schema.prisma` will be provided separately — implement services/repositories against it, don't redesign the schema.

---

## 4. Required modules & responsibilities

### Auth module
- Sign up / login (via chosen auth provider)
- Session/JWT validation middleware
- Brand-scoped guard: every protected route must verify the requesting user has a Membership on the target Brand, and enforce role permissions where relevant (e.g. only Owner/Admin can disconnect accounts or delete the brand)

### Brands module
- CRUD for brands (create, update settings, list brands for current user)
- Membership management (invite, change role, remove — if multi-user is in scope for this phase)

### Accounts module
- OAuth connect flow per platform (Instagram, LinkedIn, X, etc.) — store access/refresh tokens encrypted at rest
- Token refresh handling (scheduled job to refresh before expiry)
- Disconnect account (soft-delete / status change, not hard delete if posts reference it)
- Health check endpoint — verify token validity, update `AccountStatus`

### Media module
- Generate signed upload URL for direct client → storage upload (don't route file bytes through the backend)
- Confirm/register uploaded media against a Post
- List/delete media

### Posts module
- Create/update post (draft state)
- Attach media, attach platform targets (one per connected account the post should go to)
- Each platform target has its own editable caption + hashtags
- Schedule post → enqueue BullMQ job for `scheduledAt` time
- Publish now → immediate enqueue
- Cancel/reschedule → update or remove queued job
- Post publishing worker: pulls job, calls the relevant platform's publish API using the SocialAccount's token, updates `PostPlatformTarget.status`, stores `externalPostId` or `errorMessage`
- Retry logic on transient failures (BullMQ backoff), mark `FAILED` after max retries with clear error message stored

### AI module
- Caption generation endpoint: takes brand context (voice/tone, content pillars), post topic/media context, target platform → returns generated caption via OpenRouter with structured output (JSON: `{ caption, hashtags[] }`)
- Must support regenerate/variations
- Keep provider-agnostic — model name should be configurable per request or brand setting, not hardcoded, since OpenRouter allows swapping models

### Analytics module
- Scheduled job (BullMQ, recurring) to pull metrics per published `PostPlatformTarget` from each platform's API and insert a new `AnalyticsSnapshot` row (time-series, never overwrite)
- Aggregation endpoints: brand-level overview (totals/averages over date range), per-post breakdown

---

## 5. Non-functional requirements

- **Multi-tenancy isolation**: every query must be scoped by `brandId` — no cross-brand data leakage, enforce at the service layer, not just the guard
- **Idempotency**: publishing jobs must be idempotent (safe to retry without double-posting) — check `PostPlatformTarget.status` before executing
- **Secrets**: social account tokens encrypted at rest (not plaintext in MySQL)
- **Rate limiting**: respect each platform's API rate limits in the BullMQ worker concurrency/throttling config
- **Error visibility**: failed jobs must surface a human-readable `errorMessage` on the `PostPlatformTarget`, not just fail silently in logs
- **Environment config**: all secrets/URLs (DB, Redis, OpenRouter key, storage keys, OAuth client secrets) via env vars, never hardcoded

---

## 6. Explicitly out of scope for this phase

- AI image/video generation (media is human-uploaded only)
- Paid ad management
- Full community management / auto-DM replies beyond simple templated responses
- Influencer outreach tooling

---

## 7. Deliverable expectations

- NestJS project with modules as listed above, Prisma schema wired up, BullMQ processors set up with Redis connection
- Clear `.env.example` listing every required variable
- Basic seed script for local dev (one test brand, one test user, one dummy social account)
- API should be documented (Swagger/OpenAPI via NestJS's built-in support) so frontend integration is straightforward

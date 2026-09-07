# Relay — What's Built & What's Left 🚀

*Last updated: 17 Aug 2026*

Hey! This is the plain-English tour of Relay. No jargon walls, no corporate fluff — just what the app does, what's working right now, and what's still on the to-do pile. If you're coming back to this after a break (or handing it to someone new), start here.

---

## 🧠 What is Relay, in one breath?

Relay is a **social media scheduling + engagement tool**. You connect your social accounts, schedule posts ahead of time, and Relay pushes them out for you. On top of that, it pulls in the **comments** people leave on your posts and can **reply to them automatically** — including with **AI** that writes replies in your brand's voice.

Think "Buffer / Hootsuite," but with a smart AI comment-responder bolted on.

---

## 🏗️ How it's put together (the tech, quickly)

Relay is two apps living in one repo:

| Part | Folder | What it is |
|------|--------|-----------|
| **Frontend** (the website you click around in) | `client/` | Next.js 15 + TypeScript + Tailwind. State handled with Zustand. |
| **Backend** (the brains + database) | `server/` | NestJS + Prisma, talking to a **MySQL** database. |

The frontend never touches the database directly — it asks the backend for everything through a small API helper (`client/lib/api.ts`).

---

## ✅ What's DONE and working

### 1. Accounts & Brands
- You sign up / log in (JWT-based auth, tokens stored in the browser).
- Everything is organized under a **Brand**. A brand owns its connected accounts, posts, comments, and settings.
- You can **connect social accounts** via OAuth (Facebook, Instagram, LinkedIn wired up).

### 2. Posting & Scheduling
- Create a post, attach media, pick which connected accounts it goes to, and schedule it.
- Relay publishes it at the scheduled time and tracks the result per-platform.
- The queue/dashboard shows what's scheduled, posted, or failed.
- 🐛 *Fixed this session:* a crash ("Cannot read properties of undefined (reading 'platform')") that hit newly scheduled posts. The backend now always sends the account platform info, and the frontend safely handles it if it's missing.

### 3. Comments — pulling them in
- Relay **syncs comments** from your published posts on Facebook, Instagram, and LinkedIn.
- **This runs automatically every 30 seconds** now (it used to be every 30 minutes). There's a guard so two syncs never overlap and step on each other.
- The comments page shows compact comment cards, and each comment has a **replies dropdown** that lazily loads its replies only when you open it (so it stays fast even with tons of comments).

#### The Facebook headache (and how we beat it)
Facebook comment-syncing was throwing `#100` permission errors. After a deep dig (we literally decrypted the stored access token to prove it was fine), we found **two real causes**:
1. **Deleted posts** — if a post was removed on Facebook/Instagram, syncing it errored out. Now Relay detects this, skips it gracefully, and clears the stale reference instead of crashing the whole sync.
2. **The comment author's name** requires a special Meta permission ("Page Public Content Access") that needs App Review. So Relay now **gracefully degrades**: it tries to fetch the author's name, and if Meta blocks that, it just labels them "Facebook user" and keeps going. No more failed syncs.

### 4. Comments — replying to them
- You can **manually reply** to any comment from the Relay UI.
- Replies now show up **instantly** — Relay optimistically saves the reply on our side the moment you send it, so you don't have to wait for the next sync to see it appear in the thread.

### 5. Auto-Reply Rules (the template system)
- You can set up **rules** that auto-reply to new comments using preset templates (per platform).
- 🐛 *Fixed this session:* auto-replies were firing on **replies to comments** (and sometimes duplicating). Now auto-reply only triggers on a **brand-new top-level comment** the first time we see it — never on replies, never twice.

### 6. 🤖 AI Comment Replies (the big new feature)
This is the headline addition. When turned on, **AI writes a unique reply to every new comment**, based on what the comment actually says — in your brand's tone.

- **New settings panel: "Comments AI"** (Settings → Comments AI):
  - A toggle to turn AI replies **on/off**.
  - An editable **"AI behaviour & tone"** box. Default is casual + funny ("like texting a witty friend"), but you can rewrite it however you want.
  - **Brand guidelines** and **Brand niche** are shown too, but read-only for now (marked "Fixed for now — managed by Relay").
- **Under the hood:** uses your DeepSeek text model (via OpenRouter) to generate the reply. Guardrails are baked in: 1–2 sentences, sounds human (not robotic), no hashtags, max one emoji, and it never makes up prices, links, or promises.
- **How the two reply systems coexist:** if AI mode is **ON**, it takes over and writes replies. If it's **OFF**, Relay falls back to your template Auto-Reply Rules. If the AI call fails for some reason, Relay quietly skips rather than sending a wrong/template reply.

### 7. Housekeeping
- Added a proper root `.gitignore` (node_modules, build output, `.env` files, logs, OS junk, demo videos).

---

## 🚧 What's PENDING / not done yet

### Meta App Review (your action, not code)
- To fetch **comment author names on Facebook**, you'd need to submit your Meta app for **Page Public Content Access** review. Until then, Facebook commenters show as "Facebook user." Instagram is unaffected. This is a Meta-side approval thing — nothing to build.

### Brand guidelines & niche are static
- In the Comments AI panel, **guidelines and niche are read-only** right now (by design, for this phase). Making them **editable and actually saved per-brand** is a natural next step — the AI already reads them, so it's mostly UI + a save endpoint.

### Nice-to-haves we discussed but haven't built
- **"Preview reply" button** in the Comments AI panel — generate a sample AI reply to a test comment so you can tune the tone *before* going live.
- **"AI" badge** on comments — a little marker showing which replies were written by AI vs. templates vs. you.

### Untracked cleanup
- Two `.mp4` demo videos are still tracked in git. There's a standing offer to `git rm --cached` them so they stop bloating the repo (they're in `.gitignore` going forward, just not removed yet). **Waiting on your OK.**

### Other platforms
- LinkedIn comment fetching is wired but **quietly returns nothing on 401/403** (permission limits) rather than erroring. Full LinkedIn comment support would need deeper permission work.

---

## 🗺️ Quick "where do I find it" map

| Thing | Where it lives |
|-------|----------------|
| API helper (frontend → backend) | `client/lib/api.ts` |
| Settings page + Comments AI tab | `client/components/settings/SettingsView.tsx` |
| Comments page (cards + replies dropdown) | `client/app/(dashboard)/comments/page.tsx` |
| Comment logic (sync, reply, auto-reply, AI) | `server/src/comments/comments.service.ts` |
| Comment API routes | `server/src/comments/comments.controller.ts` |
| The 30-second sync job | `server/src/comments/comments.scheduler.ts` |
| AI reply generation | `server/src/ai/ai.service.ts` |
| OAuth / account connecting | `server/src/oauth/oauth.service.ts` |
| Database shape | `server/prisma/schema.prisma` |

---

## 🎯 TL;DR

**Working:** login, brands, connecting socials, scheduling & posting, comment syncing (every 30s), manual replies (instant), template auto-replies, and the new **AI comment replies** with its own settings panel.

**Pending:** Meta app review for FB author names, making brand guidelines/niche editable, optional "preview reply" + "AI badge" polish, and a small git cleanup for those demo videos.

You're in a really solid spot — the core loop (schedule → publish → sync comments → auto/AI reply) is fully alive. 🎉

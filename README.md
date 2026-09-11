# Relay

> A social media scheduling and engagement platform with an AI-powered comment responder.

Relay lets you connect your social accounts (Facebook, Instagram, LinkedIn, X, TikTok), schedule posts in advance, and automatically pull in the comments people leave on those posts. On top of that, it can reply to those comments for you — either using preset templates or with AI that writes unique, on-brand replies to each comment.

Think **Buffer / Hootsuite**, plus a smart AI comment-responder built in.

---

## Table of Contents

1. [What Relay Does](#what-relay-does)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Installation & Setup](#installation--setup)
6. [Environment Variables](#environment-variables)
7. [Running the App](#running-the-app)
8. [Database Migrations](#database-migrations)
9. [OAuth / Social Account Setup](#oauth--social-account-setup)
10. [Common Commands](#common-commands)
11. [Troubleshooting](#troubleshooting)
12. [Further Reading](#further-reading)

---

## What Relay Does

- **Accounts & Brands** — Sign up with email/password (JWT auth). Everything is organized under a *Brand*, which owns its connected social accounts, scheduled posts, comments, and settings.
- **Connect Social Accounts** — OAuth flow for Facebook, Instagram, LinkedIn, X (Twitter), and TikTok.
- **Post Scheduling** — Create a post, attach media, pick target accounts, schedule it. Relay publishes it at the scheduled time and reports per-platform success/failure.
- **Comment Sync** — Every 30 seconds, Relay pulls new comments from your published posts.
- **Manual & Template Replies** — Reply from the Relay UI, or set up auto-reply rules that use preset templates for new top-level comments.
- **AI Comment Replies** — Toggle on AI mode and Relay will generate a unique, tone-controlled reply to every new comment using DeepSeek (via OpenRouter). Configurable brand voice.
- **Competitor Tracking & Trends** — Watch competitor accounts and cached trend data (via RapidAPI sources).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Zustand |
| Backend | NestJS 11, Prisma 6, TypeScript |
| Database | MySQL |
| Queue / Cache | Redis (via ioredis + BullMQ) |
| Auth | JWT (Passport) |
| Media Storage | Cloudinary / AWS S3 |
| AI | OpenRouter (DeepSeek) |

---

## Project Structure

```
Relay/
├── client/          # Next.js 15 frontend
│   ├── app/         # App-router pages
│   ├── components/  # UI components
│   ├── lib/         # API helper (lib/api.ts) & utilities
│   └── store/       # Zustand stores
├── server/          # NestJS backend
│   ├── src/         # Modules (auth, oauth, comments, ai, posts, etc.)
│   ├── prisma/      # schema.prisma + migrations
│   └── uploads/     # Local uploads (dev)
├── documents/       # Product, technical, integration, brand, and progress docs
└── README.md        # (this file)
```

---

## Prerequisites

Install these before starting:

- **Node.js** v20 or newer — https://nodejs.org
- **npm** v10+ (ships with Node)
- **MySQL** 8.x running locally (or a remote instance) — https://dev.mysql.com/downloads/
- **Redis** (for background jobs & the comment sync scheduler) — https://redis.io/download
- **Git** — https://git-scm.com

Optional but useful:
- **MySQL Workbench** or **DBeaver** for browsing the DB
- **Postman** or **Insomnia** for hitting the API directly

---

## Installation & Setup

### 1. Clone the repository

```powershell
git clone <your-repo-url> Relay
cd Relay
```

### 2. Install backend dependencies

```powershell
cd server
npm install
```

The `postinstall` hook automatically runs `prisma generate` to build the Prisma Client.

### 3. Install frontend dependencies

```powershell
cd ../client
npm install
```

### 4. Create your environment files

- Create `server/.env` — see [Environment Variables](#environment-variables) below.
- Create `client/.env.local` — see [Environment Variables](#environment-variables) below.

### 5. Create the MySQL database

Open MySQL and create an empty database:

```sql
CREATE DATABASE relay;
```

(Prisma will also auto-create it if the user has permission.)

### 6. Run the database migrations

From the `server/` folder:

```powershell
npx prisma migrate deploy
```

This applies all existing migrations in `prisma/migrations/` to your database.

If you plan to change the schema during development, use:

```powershell
npx prisma migrate dev --name your_change_name
```

### 7. Start Redis

Make sure Redis is running locally on `localhost:6379` (default), or update the connection settings in your `.env`.

---

## Environment Variables

### `server/.env`

```env
# --- Core ---
DATABASE_URL="mysql://root:password@localhost:3306/relay"
JWT_SECRET=your_long_random_string
PORT=3001

# --- URLs ---
SERVER_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# --- Redis ---
REDIS_HOST=localhost
REDIS_PORT=6379

# --- Social OAuth (see documents/context/integrations/OAUTH_SETUP.md) ---
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# --- AI (OpenRouter / DeepSeek) ---
OPENROUTER_API_KEY=

# --- Media storage (choose one) ---
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=

# --- Email (nodemailer) ---
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

### `client/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

---

## Running the App

Open **two terminals**.

**Terminal 1 — backend:**

```powershell
cd server
npm run start:dev
```

Backend runs on `http://localhost:3001`. Swagger docs at `http://localhost:3001/api/docs`.

**Terminal 2 — frontend:**

```powershell
cd client
npm run dev
```

Frontend runs on `http://localhost:3000`. Open it in your browser and sign up.

---

## Database Migrations

All Prisma commands run from the `server/` folder.

| Task | Command |
|------|---------|
| Apply pending migrations | `npx prisma migrate deploy` |
| Create + apply a new migration | `npx prisma migrate dev --name <name>` |
| Regenerate Prisma Client | `npx prisma generate` |
| Check migration status | `npx prisma migrate status` |
| Browse data in a GUI | `npx prisma studio` |
| Reset DB (destructive) | `npx prisma migrate reset` |

---

## OAuth / Social Account Setup

Each social platform needs an app configured in its developer portal (client ID/secret, redirect URI, scopes). Full step-by-step instructions for LinkedIn, Facebook, Instagram, X, and TikTok are in [the OAuth setup guide](./documents/context/integrations/OAUTH_SETUP.md).

Callback URL pattern:
- Dev: `http://localhost:3001/api/v1/oauth/callback/{platform}`
- Prod: `https://your-domain.com/api/v1/oauth/callback/{platform}`

---

## Common Commands

**Server (`server/`):**

| Script | Purpose |
|--------|---------|
| `npm run start:dev` | Start backend in watch mode |
| `npm run start` | Start backend (no watch) |
| `npm run build` | Build for production |
| `npm run start:prod` | Run the compiled build |
| `npm run lint` | Lint & auto-fix |
| `npm test` | Run unit tests |

**Client (`client/`):**

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |
| `npm run start` | Run the production build |
| `npm run lint` | Lint the frontend |

---

## Troubleshooting

- **`P1001: Can't reach database`** — MySQL isn't running or `DATABASE_URL` is wrong. Check the port, credentials, and that the DB exists.
- **`ECONNREFUSED 127.0.0.1:6379`** — Redis isn't running. Start it (`redis-server`) or update `REDIS_HOST` / `REDIS_PORT`.
- **OAuth redirect mismatch** — The redirect URI in the developer portal must match `SERVER_URL` + `/api/v1/oauth/callback/{platform}` exactly.
- **Prisma Client out of date** — Run `npx prisma generate` inside `server/`.
- **Facebook comments show as "Facebook user"** — Expected until Meta approves *Page Public Content Access* for your app.
- **Port already in use** — Change `PORT` in `server/.env` or stop the process on port 3000/3001.

---

## Further Reading

- [Project overview](./documents/context/product/PROJECT_OVERVIEW.md) — What's built, what's pending, plain-English tour.
- [OAuth setup](./documents/context/integrations/OAUTH_SETUP.md) — Detailed OAuth portal setup for every platform.
- [Brand guidelines](./documents/context/brand/RELAY_BRAND_GUIDELINES.md) — Brand tone & style.
- [Progress notes](./documents/progress/PROGRESS.md) and [project status](./documents/progress/PROJECT_STATUS.md) — Historical progress notes.

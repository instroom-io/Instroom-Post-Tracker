# Instroom Post Tracker

Multi-tenant B2B SaaS for influencer marketing agencies. Automatically detects, downloads, and tracks influencer posts across Instagram, TikTok, and YouTube — with frozen 7-day metrics, EMV calculation, and Google Drive archiving.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript strict |
| Database | Supabase (Postgres + Auth + RLS) |
| Styling | Tailwind CSS with custom design tokens |
| Client state | Zustand + TanStack Query v5 |
| Post ingestion | EnsembleData API |
| File storage | Google Drive via service account |
| Email | SendGrid |
| Deployment | Vercel (web app) + external scheduler (workers) |

---

## Architecture

```
Instroom Platform (super admin)
  └── Agencies
        └── Brand Workspaces
              └── Campaigns
                    └── Influencers + Posts
```

- **Post detection**: `workers/src/posts-worker.ts` — polls EnsembleData once daily per active campaign influencer; TikTok uses cursor-based pagination for backfill
- **Downloads**: `workers/src/download-worker.ts` — processes retry queue, uploads media to Google Drive
- **Metrics**: `workers/src/metrics-worker.ts` — fetches 7-day-frozen performance data after post publish
- **Follow-ups**: `workers/src/followup-worker.ts` — sends influencer reminder emails at day 10 and day 13 if no posts detected
- **Workspace creation**: Agencies invite brands via the Invite Brand dialog → brand receives a link at `/brand-invite/[token]` → completes public form → workspace auto-created

---

## Local Development

### Prerequisites
- Node.js 20+
- Supabase project (free tier works)
- EnsembleData account with API key
- Google Cloud service account with Drive API access
- SendGrid account with a verified sender

### Setup

```bash
cp .env.local.example .env.local   # fill in all values
npm install
npm run db:push                     # apply schema to Supabase
npm run db:generate                 # regenerate TypeScript types
npm run dev                         # http://localhost:3000
```

### Running Workers Locally

Workers are standalone Node.js scripts in `workers/`. Run them manually against your local `.env.local`:

```bash
cd workers
npm install
npm run dev:posts       # run posts worker once
npm run dev:download    # run download worker once
npm run dev:metrics     # run metrics worker once
npm run dev:followup    # run followup worker once
```

---

## Environment Variables

See `.env.local.example` for all required variables with setup instructions.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Never expose to browser** |
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3000` locally; production URL in production |
| `ENSEMBLE_API_KEY` | Yes | EnsembleData token |
| `ENSEMBLE_API_URL` | No | Defaults to `https://ensembledata.com/apis` |
| `GOOGLE_SERVICE_ACCOUNT_JSON_B64` | Yes | `cat key.json \| base64 \| tr -d '\n'` |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Yes | Shared Drive root folder ID |
| `GOOGLE_OAUTH_CLIENT_ID` | No | For per-user "Save to My Drive" feature |
| `GOOGLE_OAUTH_CLIENT_SECRET` | No | For per-user "Save to My Drive" feature |
| `SENDGRID_API_KEY` | Yes | SendGrid API key |
| `SENDGRID_FROM_EMAIL` | Yes | Verified sender address |
| `AGENCY_NOTIFICATION_EMAIL` | Yes | Inbox that receives new brand request alerts |
| `ADMIN_EMAIL` | Yes | Only this email can sign up without an invite |
| `CRON_SECRET` | Yes | `openssl rand -hex 32` |

---

## Workers

Workers live in `workers/` as standalone TypeScript scripts. Schedule them with any external cron runner (Railway, Render, cron-job.org, etc.).

| Worker | Recommended schedule | Purpose |
|---|---|---|
| `posts-worker` | Daily (e.g. 4PM UTC) | Scrape new posts from EnsembleData |
| `download-worker` | Every 5–15 min | Download media to Google Drive |
| `metrics-worker` | Every 10–30 min | Fetch 7-day performance metrics |
| `followup-worker` | Daily (e.g. 9AM UTC) | Send influencer follow-up emails |

---

## Scripts

```bash
# Web app (root)
npm run dev           # dev server on localhost:3000
npm run build         # production build
npm run type-check    # tsc --noEmit
npm run lint          # ESLint
npm run db:generate   # regenerate lib/types/supabase.ts
npm run db:push       # push migrations to Supabase

# Workers (workers/)
npm run dev:posts
npm run dev:download
npm run dev:metrics
npm run dev:followup
```

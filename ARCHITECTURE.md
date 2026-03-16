# Architecture — Instroom

---

## 1. System Overview

```
Browser (React / Next.js 15)
  │
  ├── Next.js App Router on Vercel
  │     ├── Server Components (RSC)  ──── Supabase (user-scoped, RLS enforced)
  │     ├── Client Components        ──── TanStack Query + Zustand
  │     ├── Server Actions           ──── Supabase (user-scoped or service role)
  │     ├── Edge Middleware          ──── Supabase session refresh + auth redirect
  │     └── API Routes
  │           ├── POST /api/webhooks/ensemble  ← Ensemble → Instroom (HMAC signed)
  │           ├── GET  /api/cron/download-worker   ← Vercel Cron (every 5 min)
  │           └── GET  /api/cron/metrics-worker    ← Vercel Cron (every 10 min)
  │
  ├── Supabase (hosted Postgres)
  │     ├── Auth (JWT + cookie sessions via @supabase/ssr)
  │     ├── Postgres (all application data)
  │     ├── Row Level Security (all multi-tenant isolation)
  │     └── pg_cron (campaign auto-end, metrics enqueueing)
  │
  └── Google Drive (content storage — service account)
```

---

## 2. App Router Route Structure

### Route groups and their purpose

```
app/
├── layout.tsx               ← Root: Inter + Manrope fonts, QueryProvider, ThemeProvider
│
├── (marketing)/             ← SSG, no auth, no sidebar overhead
│   ├── layout.tsx           ← Marketing nav + footer only
│   └── page.tsx             ← Landing page
│
├── (auth)/                  ← Minimal layout (logo + form card)
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── callback/route.ts    ← OAuth / magic-link PKCE code exchange
│
├── (app)/
│   └── [workspaceSlug]/
│       └── (dashboard)/     ← ALL authenticated workspace routes
│           ├── layout.tsx   ← THE auth + membership boundary (see §3)
│           ├── error.tsx    ← Error boundary for dashboard crashes
│           ├── overview/page.tsx
│           ├── campaigns/page.tsx
│           ├── campaigns/[campaignId]/page.tsx
│           ├── influencers/page.tsx
│           ├── posts/page.tsx
│           ├── analytics/page.tsx
│           └── settings/page.tsx
│
├── api/
│   ├── webhooks/ensemble/route.ts      ← External POST, HMAC only, service client
│   └── cron/
│       ├── download-worker/route.ts    ← GET, Vercel Cron Bearer token
│       └── metrics-worker/route.ts    ← GET, Vercel Cron Bearer token
│
├── app/page.tsx             ← Redirect: → /{lastWorkspace}/overview or /onboarding
├── invite/[token]/page.tsx  ← Public — team member invite token validation + acceptance
├── onboard/[token]/page.tsx ← PRODUCTION — brand onboarding acceptance (auto-creates workspace)
└── onboarding/page.tsx      ← DEV ONLY — manual workspace creation (disable in production)
```

### Why this structure?

- `(marketing)` — SSG pages render with no auth overhead
- `(auth)` — auth pages have no sidebar, minimal layout
- `(dashboard)/layout.tsx` — **single auth boundary** for all 6 workspace routes. Validates membership once; child pages never re-check auth
- `onboard/[token]` — **production workspace entry point**. Brand admin clicks agency-generated link → auto-creates workspace. No sidebar, no auth required upfront (auth gate is inside the page)
- `invite/[token]` — team member invitation acceptance. Workspace already exists; just adds the user to `workspace_members`
- `onboarding` — **dev only**. Manual workspace creation for local development. Must not be accessible in production
- No route needs to protect itself individually — layout handles it all

---

## 3. The Dashboard Layout — Auth Boundary

`app/(app)/[workspaceSlug]/(dashboard)/layout.tsx` does exactly these steps on every request:

1. Get the current user from Supabase (`auth.getUser()`) — if not authed, redirect to `/login`
2. Look up the workspace by slug from `workspaces` table
3. Confirm the user has a row in `workspace_members` for that workspace
4. Fetch all the user's memberships (for the workspace switcher)
5. Render `<AppShell>` with the verified workspace, user, and memberships as props

**If steps 1–3 fail → redirect. Child pages never need to check auth.**

### AppShell layout (current)

```
┌─────────────────────────────────────────────────────────────┐
│ [in] instroom          │  bg-background-surface  [Z Zippit˅]│  ← h-14 top bar
│      POST TRACKER      │─────────────────────────────────────│
│────────────────────────│                                     │
│  MENU                  │  {page content — overflow-y-auto}  │
│  Overview              │                                     │
│  Campaigns             │                                     │
│  ...                   │                                     │
│                        │                                     │
│  [N] Niariay...        │                                     │  ← UserMenu at bottom
└─────────────────────────────────────────────────────────────┘
```

- Sidebar: `w-[220px]` expanded / `w-[56px]` collapsed — animated with Framer Motion
- Toggle button straddling the sidebar border at mid-height
- Top-right bar: WorkspaceSwitcher (`align="right"`) — Shopify-style rounded pill
- Workspace data flows via props — no Zustand involved in the switcher

---

## 4. Data Fetching Strategy

### Server Components (RSC) — default

Use for all data that:
- Is loaded on page navigation
- Requires RLS enforcement
- Doesn't need real-time updates

Pattern: Always `Promise.all` for parallel queries.

```tsx
// ✅ One round-trip for N independent queries
const [{ data: campaigns }, { data: influencers }, { data: posts }] = await Promise.all([
  supabase.from('campaigns').select('id, name, status, platforms, start_date, end_date').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
  supabase.from('influencers').select('id, full_name, ig_handle').eq('workspace_id', workspaceId),
  supabase.from('posts').select('id, platform, posted_at, download_status').eq('workspace_id', workspaceId).limit(10).order('detected_at', { ascending: false }),
])
```

### TanStack Query — client-side cache + optimistic updates

Use for:
- Paginated tables with filters (posts, influencers)
- Data that changes frequently (collab status toggles, usage rights)
- Any data the user can modify inline without navigating

Pattern: Wrap pages that use TanStack Query in the `QueryProvider` (already in the root layout).

### Zustand — workspace context (limited use)

The `useWorkspaceStore` holds:
- `currentWorkspaceId`
- `currentWorkspaceSlug`
- `currentRole`
- `allMemberships`

This is persisted to `localStorage`. It is **no longer used by the WorkspaceSwitcher or AppShell** — those components receive workspace data directly via props from the dashboard layout server component. The store is retained for any client components that need workspace context without prop-drilling.

> Note: Zustand is only accessible in Client Components. Server Components receive workspace data via props from the dashboard layout.

---

## 5. Authentication & Authorization

### Auth flow

1. User signs in via `(auth)/login/` → Supabase Auth → sets session cookie
2. Middleware refreshes cookie on every request (required by `@supabase/ssr`)
3. Dashboard layout validates workspace membership
4. RLS enforces data isolation at DB level — no query can return rows from another workspace

### Middleware — edge, auth only

`middleware.ts` does exactly two things:
1. Refreshes the Supabase session cookie
2. Redirects unauthenticated requests to `/login?redirectTo=...`

It does **not** check workspace membership (that's the layout's job).

Matcher: `/((?!_next/static|_next/image|favicon|api/webhooks).*)` — excludes static assets and the webhook route.

### RLS policies

All tables have RLS enabled. Workspace isolation via the helper function:

```sql
create function public.my_workspace_ids()
returns setof uuid language sql security definer as $$
  select workspace_id from workspace_members where user_id = auth.uid()
$$;
```

Write permissions by role:

| Action | Minimum role |
|--------|-------------|
| View any data | `viewer` |
| Create/edit campaigns | `editor` |
| Toggle usage rights | `editor` |
| Update collab status | `editor` |
| Add/remove influencers | `editor` |
| Invite/remove members | `admin` |
| Delete campaigns | `admin` |
| Update workspace settings | `admin` |
| Change EMV config | `admin` |

### Service role — admin client

Only these places use `createServiceClient()` (bypasses all RLS):
1. `app/api/webhooks/ensemble/route.ts` — writes posts for any workspace
2. `lib/actions/workspace.ts` — workspace creation + team member invitation acceptance
3. `lib/actions/brands.ts` — brand entry creation, token generation, brand invitation acceptance (auto-creates workspace + adds brand admin as owner)

---

## 6. Post Detection Pipeline

```
Ensemble → POST /api/webhooks/ensemble
   │
   Step 1: Verify HMAC-SHA256 signature (ENSEMBLE_WEBHOOK_SECRET)
   │         ↳ 401 if invalid
   │
   Step 2: Find matching campaigns
   │         SELECT campaigns + tracking_configs WHERE:
   │           status = 'active'
   │           AND start_date ≤ posted_at ≤ end_date
   │           AND platform matches
   │           AND (hashtags && payload.hashtags OR mentions && payload.mentions)
   │         ↳ 200 (silent discard) if no match
   │
   Step 3: For each matching campaign:
   │   │
   │   Step 3a: Find influencer by ensemble_id in workspace
   │   │         ↳ skip campaign if not found
   │   │
   │   Step 3b: Upsert post
   │   │         INSERT ... ON CONFLICT (ensemble_post_id, campaign_id) DO NOTHING
   │   │         ↳ skip if duplicate
   │   │
   │   Step 3c: Usage rights check
   │             SELECT usage_rights FROM campaign_influencers WHERE ...
   │
   │             usage_rights = false:
   │               UPDATE post SET download_status='blocked', blocked_reason='no_usage_rights'
   │               STOP — do not enqueue
   │
   │             usage_rights = true:
   │               INSERT retry_queue (post_id, job_type='download', status='pending')
   │
   │   Step 3d: collab_status set by DB trigger (no app code)
   │             n/a for TikTok/YouTube, pending for Instagram
   │
   Step 4: Return 200 (always — prevents Ensemble retries on valid discards)
```

**Why `retry_queue` instead of direct download?**
The webhook must respond in < 3 seconds or Ensemble retries. A Drive upload can take 5–30 seconds. The queue decouples detection from delivery.

---

## 7. Content Download Worker

**Trigger:** Vercel Cron `GET /api/cron/download-worker` — every 5 minutes.

```
Claim up to 10 pending download jobs (FOR UPDATE SKIP LOCKED — prevents double-processing)
  │
  For each job:
    1. Fetch post + campaign + influencer + workspace data
    2. Download from Ensemble API (Bearer token)
    3. Build Drive path: /{workspace}/{campaign}/{influencer}/{platform}/
    4. Create Drive folders if not exists (cached to avoid duplicate API calls)
    5. Upload file to Drive
    6. UPDATE post: download_status='downloaded', drive_file_id, drive_folder_path, downloaded_at
    7. UPDATE retry_queue: status='done', processed_at
  
  On failure:
    attempts >= 3 → UPDATE post: download_status='failed'
                    UPDATE retry_queue: status='failed', error
    attempts < 3  → UPDATE retry_queue: status='pending', scheduled_at = now() + 15 min
```

---

## 8. Analytics Pipeline

```
pg_cron (hourly) — enqueue-metrics-fetch job:
  INSERT INTO retry_queue (post_id, job_type='metrics_fetch')
  WHERE metrics_fetched_at IS NULL
    AND metrics_fetch_after ≤ now()
    AND no existing pending/processing job for this post

Vercel Cron (every 10 min) — GET /api/cron/metrics-worker:
  Claim up to 10 pending metrics_fetch jobs
    For each:
      1. Call Ensemble metrics API for post
      2. Fetch CPM rate from emv_config for workspace + platform
      3. Calculate EMV = views × (cpm_rate / 1000)
      4. INSERT post_metrics (immutable — no ON CONFLICT, no updates ever)
      5. UPDATE posts SET metrics_fetched_at = now()
      6. UPDATE retry_queue SET status='done'
```

**Metrics are frozen.** `emv_cpm_used` is stored so historical EMV is stable even if CPM config changes.

---

## 9. Google Drive Structure

```
/{workspace.name}/
  /{campaign.name}/
    /{influencer.ig_handle || influencer.full_name}/
      /instagram/
        post-{id}.mp4
        post-{id}.jpg
      /tiktok/
        post-{id}.mp4
      /youtube/
        post-{id}.mp4
```

- Service account owns the root Drive folder
- Folder hierarchy is created on demand (first upload creates all missing folders)
- `drive_folder_path` and `drive_file_id` stored on each `posts` row for deep linking

---

## 10. Multi-Tenancy Model

```
auth.users
  │
  ├── [agency user] → brands (agency_id)
  │     └── brand_invitations (token, expires_at, accepted_at)
  │           └── [on accept] → workspaces (auto-created)
  │
  └── workspace_members (role: owner | admin | editor | viewer)
        └── workspaces
              ├── campaigns
              │     ├── campaign_tracking_configs  [unique: campaign_id + platform]
              │     └── campaign_influencers        [unique: campaign_id + influencer_id]
              ├── influencers
              ├── posts                             [unique: ensemble_post_id + campaign_id]
              │     └── post_metrics               [unique: post_id]
              └── emv_config
```

All workspace tables have `workspace_id`. RLS ensures users only see data in workspaces they're members of. `brands` and `brand_invitations` are managed exclusively via service client — no user-scoped RLS queries needed.

---

## 11. Scheduled Jobs Summary

| Job | Trigger | What it does |
|-----|---------|-------------|
| `end-expired-campaigns` | pg_cron, daily 00:00 UTC | `status = 'ended'` where `end_date < today` |
| `pause-ended-monitoring` | pg_cron, daily 00:05 UTC | `monitoring_status = 'paused'` for ended campaign influencers |
| `enqueue-metrics-fetch` | pg_cron, hourly | INSERT `retry_queue` rows for posts ready for metrics |
| `cleanup-retry-queue` | pg_cron, daily 01:00 UTC | DELETE `done`/`failed` rows older than 30 days |
| `download-worker` | Vercel Cron, `*/5 * * * *` | Process pending download jobs |
| `metrics-worker` | Vercel Cron, `*/10 * * * *` | Process pending metrics_fetch jobs |

---

## 12. Deployment

| Environment | URL | Branch |
|-------------|-----|--------|
| Local dev | `localhost:3000` | any |
| Preview | `*.vercel.app` | any PR |
| Production | `app.instroom.co` | `main` |

### Vercel config (`vercel.json`)
```json
{
  "crons": [
    { "path": "/api/cron/download-worker", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/metrics-worker", "schedule": "*/10 * * * *" }
  ]
}
```

### Supabase config
- Connection pooler (Supavisor) for production
- RLS enabled on ALL tables — no exceptions
- pg_cron extension enabled
- Service role key stored in Vercel environment variables only (never in code)
- Node version: 20.x

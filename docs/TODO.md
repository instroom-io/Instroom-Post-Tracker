# Instroom Post Tracker — TODO

> **Last updated:** 2026-03-19
> Accurate as of current codebase state.

---

## ✅ Fully Complete

### Phase 1 — DB Schema + Supabase Project
- Initial schema, RLS policies, triggers, indexes, pg_cron jobs (`0001_initial_schema.sql`)

### Phase 2 — Auth
- Signup, login, email verification, session management, middleware (`proxy.ts`)
- Post-login redirect dispatcher: 5-tier routing (platform admin → agency owner → brand portal → workspace member → no-access)

### Phase 3 — Workspace Creation + Onboarding
- Workspace CRUD, `workspace_members` RLS, dev `/onboarding` page (local only)

### Phase 4 — Campaign CRUD
- Create / edit / delete campaigns with platform selection, date range, status lifecycle

### Phase 5 — Influencer Management
- Add / edit influencers per workspace, social handle fields (IG, TikTok, YouTube)
- Campaign–influencer linking (`campaign_influencers`)

### Phase 6 — Ensemble Webhook + Post Detection
- HMAC-SHA256 verified webhook at `/api/webhooks/ensemble`
- Inserts posts, enqueues downloads, deduplicates by platform post ID

### Phase 7 — Download Worker + Google Drive
- Cron worker at `/api/cron/download-worker`
- Downloads media via Ensemble API, uploads to Google Drive service account
- Parallel execution via `Promise.allSettled`, 10 jobs/run
- Usage rights gate: skips download if rights not granted

### Phase 8 — Metrics Worker + EMV
- Cron worker at `/api/cron/metrics-worker`
- Fetches frozen performance metrics 7 days after publish
- EMV calculation using configurable CPM rates per platform

### Phase 9 — Analytics Dashboard
- Post volume chart, EMV chart, platform breakdown, ER benchmark, influencer leaderboard
- Date range filter, TanStack Query caching

### Phase 10 — Settings
- Workspace settings (name, logo URL, Drive folder ID)
- Member management (invite, role change, remove)
- EMV config (CPM rates per platform)

### Phase 11 — Brand Portal
- Read-only portal at `/(portal)/portal` for `workspace_members(role='brand')`
- Drive status banner, brand post list

### Phase 12 — Invite Flow
- Team member invitation at `/invite/[token]`
- Email-based invite with token expiry, role assignment

### Phase 13 — Usage Rights Gate
- Per-influencer per-campaign toggle
- Blocks download worker until rights granted
- Optimistic UI with `useOptimistic`

### Phase 15 — Multi-Agency Platform
- 3-tier hierarchy: Instroom (super admin) → Agencies → Brand workspaces
- **Admin routes:** `/admin`, `/admin/agencies`, `/admin/agencies/[agencyId]`
- **Agency routes:** `/agency/[slug]/dashboard`, `/requests`, `/brands`, `/settings`
- **Brand request flow:** `/request-access` (Brand tab) → agency approves → workspace auto-created → brand receives onboarding email → `/onboard/[token]` confirmation → `/[slug]/portal`
- **Agency request flow:** `/request-access` (Agency tab) → Instroom admin approves → agency owner gets access
- **Email flows:** brand request → agency notification email; approval → brand confirmation email with onboarding link; team invite → invitation email (SendGrid)
- DB migration `0011_multi_agency_platform.sql`: `agencies`, `agency_requests`, `is_platform_admin`, `agency_id` FKs, brand role

---

## 🔴 Pre-Production Blockers

These must be resolved before going live.

### 1. `vercel.json` only schedules 1 of 3 cron workers

`posts-worker` (scraping) runs daily at 8 AM. `download-worker` and `metrics-worker` are **never scheduled** — media never downloads and metrics are never fetched in production.

**Worker responsibilities:**
- `posts-worker` — scrapes EnsembleData API, inserts new posts, enqueues downloads (sequential, runs per influencer)
- `download-worker` — downloads media to Google Drive (parallel, `Promise.allSettled`, 10 jobs/run)
- `metrics-worker` — fetches post performance 7 days after publish (parallel, 10 jobs/run)

**Fix for Vercel Hobby (2 cron slots):**
```json
{ "path": "/api/cron/posts-worker",    "schedule": "0 */6 * * *" },
{ "path": "/api/cron/download-worker", "schedule": "*/30 * * * *" }
```
`metrics-worker` gets its own slot on Pro, or can be triggered from within `download-worker` as a combined pass.

### 2. Supabase Site URL still set to `http://localhost:3000`

Auth emails (magic links, email confirmation) will redirect to localhost.
**Fix:** Supabase Dashboard → Authentication → URL Configuration → set Site URL to production URL.

### 3. SendGrid env vars not set in Vercel

`SENDGRID_API_KEY` and `AGENCY_NOTIFICATION_EMAIL` must be added to Vercel environment variables.
Without these, brand request notification emails and approval emails silently fail.

**Setup steps:**
1. Create a SendGrid account at sendgrid.com (free tier: 100 emails/day)
2. Dashboard → Settings → API Keys → Create API Key (Mail Send permission only)
3. Dashboard → Settings → Sender Authentication → Single Sender Verification
4. Add to Vercel env vars: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `AGENCY_NOTIFICATION_EMAIL`

### 4. `/onboarding` page must be disabled in production

`app/onboarding/page.tsx` is a dev-only manual workspace creator. It bypasses the full brand request flow.
**Fix:** Add route guard checking `NODE_ENV === 'development'` or remove the page from the production build.

### 5. All Vercel env vars must be set

Ensure these are configured in the Vercel dashboard before deploying:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `ENSEMBLE_API_KEY`
- `GOOGLE_SERVICE_ACCOUNT_JSON_B64`
- `CRON_SECRET`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `AGENCY_NOTIFICATION_EMAIL`

---

## 🟡 Feature Backlog (post-launch)

### Phase 14 — Google Drive OAuth per Brand Workspace

Schema columns exist (`drive_oauth_token`, `drive_connection_type`, `drive_folder_id`) but nothing is implemented.

- [ ] `app/api/auth/google-drive/route.ts` — OAuth initiation
- [ ] `app/api/auth/google-drive/callback/route.ts` — OAuth callback + token storage
- [ ] `lib/drive/client.ts` — per-workspace Drive client factory using stored token
- [ ] Update `lib/drive/upload.ts` to use per-workspace OAuth token when available
- [ ] Update download worker to use workspace Drive token
- [ ] `components/settings/drive-connection-panel.tsx` — UI for connecting Drive
- [ ] Update `docs/WORKFLOWS.md` with Drive OAuth flow

### UI Polish

- [ ] **Batch influencer input** — textarea that accepts comma- or newline-separated handles; system parses and adds each as a separate influencer in one action (replaces one-by-one dialog)
- [ ] Workspace logo upload (currently text URL input only)
- [ ] `PostsTable` pagination (no pagination for >100 posts)
- [ ] Brand portal: campaign breakdown view
- [ ] Onboard token regeneration (resend expired onboarding link to brand)

### Admin

- [ ] Agency owner reassignment (in case contact email changes)
- [ ] Brand request pagination in agency requests view
- [ ] Admin agency list pagination

### Reliability

- [ ] Webhook rate limiting on `app/api/webhooks/ensemble/route.ts`
- [ ] `Suspense` boundaries on remaining heavy pages (only `/overview` currently wrapped)

---

## 📚 Missing Documentation

These files are referenced in `CLAUDE.md` but do not yet exist:

- [ ] `docs/DESIGN_SYSTEM.md` — design tokens, component patterns, dark mode rules
- [ ] `docs/COMPONENTS.md` — component inventory with status and build guides
- [ ] `docs/CODE_STYLE.md` — TypeScript patterns, Server Action conventions, Tailwind rules

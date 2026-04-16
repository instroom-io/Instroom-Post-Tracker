# Instroom Post Tracker — TODO

> **Last updated:** 2026-04-08
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

### Phase 6 — Post Detection (Polling)
- Scheduled polling via `workers/src/posts-worker.ts` (Railway cron)
- Inserts posts, enqueues downloads, deduplicates by platform post ID
- Cursor-based TikTok pagination (`tiktok_next_cursor`, `tiktok_backfill_complete`)

### Phase 7 — Download Worker + Google Drive
- Railway worker at `workers/src/download-worker.ts`
- Downloads media via Ensemble API, uploads to Google Drive service account
- Parallel execution via `Promise.allSettled`, 10 jobs/run
- Usage rights gate: skips download if rights not granted

### Phase 8 — Metrics Worker + EMV
- Railway worker at `workers/src/metrics-worker.ts`
- Fetches frozen performance metrics 7 days after publish
- EMV calculation using configurable CPM rates per platform

### Phase 9 — Analytics Dashboard
- Post volume chart, EMV chart, platform breakdown, ER benchmark, influencer leaderboard
- Date range filter, TanStack Query caching

### Phase 10 — Settings
- Workspace settings (name, logo URL, Drive folder ID)
- Member management (invite, role change, remove)
- EMV config (CPM rates per platform)

### Phase 12 — Invite Flow
- Team member invitation at `/invite/[token]`
- Email-based invite with token expiry, role assignment

### Phase 13 — Usage Rights Gate
- Per-influencer per-campaign toggle
- Blocks download worker until rights granted
- Optimistic UI with `useOptimistic`

### Phase 15 — Multi-Agency Platform (REMOVED in v2.0)
- 3-tier hierarchy replaced by 2-tier self-serve model (see D-024)
- **Admin routes kept:** `/admin`, `/admin/agencies` (platform admin workspace management)
- **Agency routes deprecated:** `/agency/[slug]/*` routes (no longer active)
- **Removed:** `/request-access` page, `agency_requests` table (dropped in migration 0036), brand portal
- DB migration `0011_multi_agency_platform.sql`: historical record only

### Phase 17 — Shared Workspace Path B (Join Request Flow)
- Shareable link `/join/[workspaceSlug]` — public page, no auth required to view
- Logged-in users can request access; Admin receives email notification
- Settings → Members shows pending requests with Approve / Deny buttons
- Approve → adds member as Manager + sends confirmation email
- Deny → marks denied + sends email to requester
- DB: `workspace_join_requests` table + RLS (migration 0037)

### Phase 16 — Rate Limiting
- Hybrid Edge + per-surface rate limiting using Upstash Redis (`@upstash/ratelimit`)
- **Edge layer (`proxy.ts`):** broad IP throttle — 60 req / 1 min on all public paths
- **Per-surface layer:** 14 additional limiters across auth, public forms, Drive proxy, download, and admin actions
- Shared module at `lib/rate-limit.ts` — pre-configured limiters + `checkActionLimit` / `checkRouteLimit` helpers
- Graceful degradation: fails **open** when Upstash is unreachable (app never goes down for Redis outage)
- Dead code cleanup: removed `verifyEnsembleSignature`, `/api/webhooks/` path from proxy, stale webhook docs

---

## 🔴 Pre-Production Blockers

These must be resolved before going live.

### 1. Supabase Site URL still set to `http://localhost:3000`

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
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `AGENCY_NOTIFICATION_EMAIL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### 6. `/onboard` path missing from `proxy.ts` publicPaths

The brand onboarding confirmation page (`/onboard/[token]`) is absent from the `publicPaths` array in `proxy.ts:39–51`. Any brand clicking their onboarding link in production gets redirected to `/login` before the page loads.

**Fix:** Add `'/onboard'` to the `publicPaths` array in `proxy.ts`.

> Note: `/onboarding` (the dev-only workspace creator, Blocker #4) IS already in the list — do not confuse the two.

---

## 🟡 Feature Backlog (post-launch)

### Phase 11 — Brand Portal (REMOVED — role='brand' dropped in v2.0)

The brand portal and `role='brand'` were removed in v2.0. Members now join as Manager or Viewer via invite or join request. This backlog item is no longer applicable.

### Phase 14 — Google Drive OAuth per Brand Workspace

Schema columns exist (`drive_oauth_token`, `drive_connection_type`, `drive_folder_id`). OAuth API routes are implemented but the UI is not wired up.

- [x] `app/api/auth/google-drive/route.ts` — OAuth initiation ✅
- [x] `app/api/auth/google-drive/callback/route.ts` — OAuth callback + token storage ✅
- [ ] `lib/drive/client.ts` — per-workspace Drive client factory using stored token
- [ ] Update `lib/drive/upload.ts` to use per-workspace OAuth token when available
- [ ] Update download worker to use workspace Drive token
- [ ] `components/settings/drive-connection-panel.tsx` — UI for connecting Drive

### Phase 15 — Agency Request Queue (REMOVED)

Removed in v2.0. The agency/brand approval flow was replaced by self-serve signup. No longer applicable.

### UI Polish

- [ ] **Batch influencer input** — textarea that accepts comma- or newline-separated handles; system parses and adds each as a separate influencer in one action (replaces one-by-one dialog)
- [ ] Workspace logo upload (currently text URL input only)
- [ ] Onboard token regeneration (resend expired onboarding link to brand)

### Admin

- [ ] Agency owner reassignment (in case contact email changes)
- [ ] Brand request pagination in agency requests view
- [ ] Admin agency list pagination

### Reliability

- [ ] `Suspense` boundaries on remaining heavy pages (only `/overview` currently wrapped)

---

## 📚 Missing Documentation

These files are referenced in `CLAUDE.md` but do not yet exist:

- [ ] `docs/DESIGN_SYSTEM.md` — design tokens, component patterns, dark mode rules
- [ ] `docs/COMPONENTS.md` — component inventory with status and build guides
- [ ] `docs/CODE_STYLE.md` — TypeScript patterns, Server Action conventions, Tailwind rules

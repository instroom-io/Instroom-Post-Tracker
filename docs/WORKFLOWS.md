# WORKFLOWS.md — Instroom Post Tracker

> Last updated: 2026-04-14. Reflects the v2.0 Solo/Team account model (2-tier: Instroom → Workspaces).

---

## Table of Contents

1. [Platform Onboarding — Self-Serve Signup](#1-platform-onboarding--self-serve-signup)
2. [Platform Onboarding — Team Member Invitation](#2-platform-onboarding--team-member-invitation)
3. [Post-Login Routing](#3-post-login-routing)
4. [Route Protection (Middleware)](#4-route-protection-middleware)
5. [Post Detection — Polling Architecture](#5-post-detection--polling-architecture)
6. [Download Worker (Cron)](#6-download-worker-cron)
7. [Metrics Worker (Cron)](#7-metrics-worker-cron)
8. [Campaign Lifecycle](#8-campaign-lifecycle)
9. [Usage Rights Gate](#9-usage-rights-gate)
10. [Known Gaps & Dev Limitations](#10-known-gaps--dev-limitations)

---

## 1. Platform Onboarding — Self-Serve Signup

**Route:** `/signup`
**Actions:** `lib/actions/auth.ts` → `signUp()` + `app/auth/callback/route.ts` → `handlePostAuth()`
**Tables:** `workspaces`, `workspace_members`

### Signup (unauthenticated)

1. User visits `/signup`, picks Solo or Team, enters account name + email + password.
2. `signUp()` Server Action:
   - Validates `signUpSchema` (email, password, full_name?, account_type, account_name)
   - Calls `supabase.auth.signUp()` storing `{ account_type, account_name }` in `user_metadata`
   - Supabase sends verification email with `emailRedirectTo = /auth/callback?next=/app`
3. User clicks the verification link.

### Email Verification → Auto-Create Workspace

`app/auth/callback/route.ts` → `handlePostAuth(user, request)`:
1. Upserts `public.users` row.
2. Sets `is_platform_admin = true` for the admin email (env var).
3. Detects new user: `created_at` and `last_sign_in_at` within 10 seconds.
4. Reads `account_type` and `account_name` from `user_metadata`.
5. If `account_name` missing (Google OAuth skipped form): redirect to `/onboarding/name`.
6. Creates workspace:
   ```
   workspaces {
     name: account_name,
     slug: deduplicateSlug(toSlug(account_name), existingSlugsThatMatch),
     plan: 'trial',
     trial_started_at: now(),
     trial_ends_at: now() + 14 days,
     account_type: 'solo' | 'team',
     workspace_quota: 1 (solo) | 3 (team)
   }
   ```
7. Inserts `workspace_members(workspace_id, user_id, role='owner')`.
8. Redirects to `/[workspaceSlug]/overview`.

**Idempotency:** If the owner already has a workspace (double-click on email link), the existing workspace is detected and redirect happens without re-creating.

### Workspace Quota

- Solo accounts (quota=1): only 1 owned workspace allowed. The `createWorkspace()` action checks `ownedWorkspaceCount < workspace_quota` before INSERT.
- Team accounts (quota=3): up to 3 owned workspaces. Platform admin can raise the quota per workspace.
- Shared workspaces (accessed via invite) never count toward quota.

---

## 2. Platform Onboarding — Team Member Invitation

**Routes:** Settings → Members → Invite; `/invite/[token]`
**Actions:** `lib/actions/workspace.ts` → `inviteMember`, `acceptInvitation`
**Page:** `app/invite/[token]/page.tsx`
**Tables:** `invitations`, `workspace_members`

### Sending an Invitation

`inviteMember(workspaceId, { email, role })`:
1. Auth: caller must be workspace member with `role` in `['owner', 'manager']`.
2. Guard: `email` must not already exist in `workspace_members` for this workspace.
3. Guard: invited `role` must not exceed caller's own role level.
4. INSERT `invitations(workspace_id, email, role='manager', token=uuid, expires_at=now()+7days)`
5. Fire email (fire-and-forget, SendGrid) to `email` with link → `/invite/[token]`

> **v2.0:** New invitations default to `role='manager'`. Legacy `'editor'` rows are accepted for backward compatibility but `'manager'` is canonical for all new invites.

### Invite Acceptance Page `/invite/[token]`

1. Service client loads `invitations` by token.
2. Validates: found, not expired, not already accepted.
3. If not logged in: offer "Sign in" (`/login?redirectTo=/invite/[token]`) or "Create account" (`/signup?redirectTo=/invite/[token]`) buttons.
4. If logged in: show "Accept invitation" button.

### Accepting the Invitation

`acceptInvitation(token)`:
1. Auth check — redirect to login if unauthenticated.
2. Load invitation (validates: found, not expired, not accepted).
3. Verify `invitation.email === user.email` (prevents accepting someone else's invite).
4. INSERT `workspace_members(workspace_id, user_id, role)`.
5. UPDATE `invitations(accepted_at=now())`.
6. Redirect to `/[workspace.slug]/overview`.

---

## 3. Post-Login Routing

**File:** `app/app/page.tsx`
**Evaluated in order — first match wins:**

| Priority | Condition | Redirect |
|----------|-----------|----------|
| 1 | `users.is_platform_admin = true` | `/admin` |
| 2 | Any `workspace_members` row (most recent `joined_at`) | `/[slug]/overview` |
| 3 | No match | `/no-access` |

---

## 4. Route Protection (Middleware)

**File:** `proxy.ts` (Next.js 16 convention — not `middleware.ts`)

### Session Refresh

Supabase session is refreshed on every request (cookie sync via `@supabase/ssr`). No redirect occurs — this is purely session maintenance.

### Public Paths (no auth required)

```
/
/login
/signup
/auth/callback
/onboarding/name         ← Google OAuth fallback — collect account name
/invite/*
/upgrade                 ← Plan upgrade request page
/onboarding              ← dev only (disabled in production)
/no-access
/api/auth/*              ← OAuth callbacks
/api/proxy-*             ← image + drive proxies
```

### Auth Boundaries

| Boundary | File | Behaviour |
|----------|------|-----------|
| Dashboard | `app/(app)/[workspaceSlug]/(dashboard)/layout.tsx` | Validates `workspace_members` row exists for slug; redirects to `/no-access` if not a member |
| Admin | `app/admin/layout.tsx` | Validates `users.is_platform_admin = true` |

---

## 5. Post Detection — Polling Architecture

Instroom uses scheduled polling to detect influencer posts. EnsembleData provides a pull-only REST API — there are no webhooks or push notifications.

**How it works:**

1. Railway runs `workers/src/posts-worker.ts` on a schedule (daily at 4 PM UTC)
2. The worker queries `campaign_influencers` for all rows with `monitoring_status = 'active'`
3. For each influencer, it calls the appropriate EnsembleData endpoint:
   - TikTok: `/tt/user/posts` with cursor-based pagination (`tiktok_next_cursor`)
   - Instagram: `/instagram/user/posts` + `/instagram/user/reels`
4. Posts are matched against the campaign tracking config (hashtags, mentions)
5. Matched posts are inserted into the `posts` table with `download_status = 'pending'`
6. The download worker and metrics worker pick up queued posts in subsequent runs

**Cursor-based TikTok pagination:**
Each `campaign_influencers` row tracks `tiktok_next_cursor` and `tiktok_backfill_complete`. During backfill, one page (~10 posts) is fetched per cron run. Once backfill is complete, only the latest posts are checked on each run.

---

## 6. Download Worker (Cron)

**File:** `workers/src/download-worker.ts`
**Runner:** Railway Cron — every 5 minutes

### Process

For each claimed job (up to 10 per run):

1. `claim_jobs({ p_job_type: 'download', p_limit: 10 })` RPC — atomically claims pending jobs from `retry_queue`.
2. Load post + campaign + influencer + workspace.
3. **Usage rights gate:** If `campaign_influencers.usage_rights = false` → skip (leave job in queue until rights are granted).
4. `fetchFreshMediaUrl(platform, platformPostId, postUrl)` → EnsembleData API:
   - **TikTok** `/tt/post/info`: extract `video.download_addr.url_list[0]` (preferred) or `video.play_addr_h264.url_list[0]` (fallback). CDN links expire — must be re-fetched at download time, not stored.
     > ⚠️ **Watermark note (verified 2026-03-23):** `download_addr` is TikTok's highest-quality CDN stream but the creator handle overlay (`TikTok @handle`) is still burned into the video. EnsembleData has no no-watermark endpoint. Truly watermark-free TikTok content must come directly from the influencer. The download pipeline still works end-to-end — it stores the best available stream.
   - **Instagram** `/instagram/post/details`: prefer `data.video_url`, fallback to `data.display_url`. Instagram downloads are clean — no platform watermark.
   - **YouTube**: not supported — returns `null`, job skipped
5. `fetch(mediaUrl)` → `arrayBuffer()` → determine MIME type and file extension.
6. `uploadToDrive({ fileBuffer, fileName, folderPath })` (`lib/drive/upload.ts`):
   - **Folder path:** `{Workspace Name}/{Campaign Name}/{influencer_handle}/{platform}/`
   - **File name:** `post-{post_id}.{ext}`
7. On **success**:
   - UPDATE `posts(download_status='downloaded', drive_file_id, drive_folder_path, downloaded_at=now())`
   - UPDATE `retry_queue(status='done', processed_at=now())`
8. On **failure**:
   - `attempts < 3`: reschedule with exponential backoff (`scheduled_at = now() + 15 * attempts minutes`), increment `attempts`
   - `attempts ≥ 3`: UPDATE `posts(download_status='failed')`, UPDATE `retry_queue(status='failed', error=message)`

---

## 7. Metrics Worker (Cron)

**File:** `workers/src/metrics-worker.ts`
**Runner:** Railway Cron — every 10 minutes

### When It Runs

Only processes posts where `posts.metrics_fetch_after <= now()` (set to `posted_at + 7 days` at detection time). Metrics are **frozen** — one row per post, never updated.

### Process

For each claimed job (up to 10 per run):

1. `claim_jobs({ p_job_type: 'metrics_fetch', p_limit: 10 })` RPC.
2. `fetchMetrics(platform, platformPostId, postUrl)` → EnsembleData API:
   - **TikTok** `/tt/post/info` → `play_count` (views), `digg_count` (likes), `comment_count`, `share_count`, `author.follower_count`
   - **Instagram** `/instagram/post/details` → `like_count`, `comment_count`, `view_count` / `play_count` / `video_view_count`, `save_count`, `owner_follower_count`
   - **YouTube** `/yt/video/details` → `view_count`, `like_count`, `comment_count`
3. Compute:
   - `engagement_rate = ((likes + comments + shares) / views) * 100`
   - Fetch `emv_config` for workspace + platform (default CPM = 5.0 if not set)
   - `emv = (views / 1000) * cpm_rate`
4. INSERT `post_metrics(post_id, workspace_id, views, likes, comments, shares, saves, follower_count, engagement_rate, emv, emv_cpm_used, fetched_at=now())` — **immutable snapshot**.
5. UPDATE `posts(metrics_fetched_at=now())`.
6. UPDATE `retry_queue(status='done')`.
7. On **failure**: same retry logic as download worker (3 attempts, exponential backoff).

---

## 8. Campaign Lifecycle

**File:** `lib/actions/campaigns.ts`
**Tables:** `campaigns`, `campaign_tracking_configs`, `campaign_influencers`

### Create

`createCampaign(workspaceId, data)`:
- Auth: workspace member with role in `['owner', 'manager']` (or legacy `'admin'`, `'editor'`)
- Schema: `createCampaignSchema` (name, platforms, start_date, end_date)
- INSERT `campaigns(workspace_id, name, platforms, start_date, end_date, created_by, status='draft')`

### Update / Archive

`updateCampaign(workspaceId, campaignId, data)`:
- Auth: same as create
- UPDATE `campaigns` (any field)

Archive = `updateCampaign(..., { status: 'ended' })`

### Auto-End (Database Trigger)

DB trigger `campaign_auto_end` fires on any `UPDATE campaigns`.
Rule: if `new.end_date < current_date AND new.status = 'active'` → set `status = 'ended'` automatically.

### Tracking Config

`upsertTrackingConfig(workspaceId, data)`:
- Auth: owner/manager (or legacy admin/editor)
- Schema: `trackingConfigSchema` (campaign_id, platform, hashtags[], mentions[])
- UPSERT `campaign_tracking_configs` on unique constraint `(campaign_id, platform)`
- **Required for post detection** — the posts worker matches scraped posts against these hashtags/mentions

---

## 9. Usage Rights Gate

**File:** `lib/actions/usage-rights.ts`
**Table:** `campaign_influencers`

`toggleUsageRights(campaignInfluencerId, value: boolean)`:
- Auth: workspace member with role in `['owner', 'manager']` (or legacy `'admin'`, `'editor'`)
- UPDATE `campaign_influencers(usage_rights=value, usage_rights_updated_at=now())`

**Effect on download worker:** If `usage_rights = false` for an influencer in a campaign, the download worker skips all their posts and leaves the job in the `retry_queue`. Once rights are granted and the cron runs again, the download proceeds.

---

## 10. Known Gaps & Dev Limitations

| # | Gap | Status |
|---|-----|--------|
| 1 | **Google Drive in local dev** | `GOOGLE_SERVICE_ACCOUNT_JSON_B64` is not set locally — Drive uploads will fail. Manually set `posts.download_status = 'downloaded'` in Supabase to test downstream flows. |
| 2 | **YouTube download** | YouTube posts are detected and metrics are fetched, but direct video download is not supported via EnsembleData. `download_status` stays `'pending'` perpetually for YouTube posts unless manually updated. |
| 3 | **Manual onboarding page** | `/onboarding` is a dev-only page for manually creating workspaces. It must be disabled (guarded or removed) before production deployment. |

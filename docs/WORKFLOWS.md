# WORKFLOWS.md — Instroom Post Tracker

> Last updated: 2026-03-19. Reflects the multi-agency platform (3-tier: Instroom → Agencies → Brand workspaces).

---

## Table of Contents

1. [Platform Onboarding — Agency Registration](#1-platform-onboarding--agency-registration)
2. [Platform Onboarding — Brand Request Flow](#2-platform-onboarding--brand-request-flow)
3. [Platform Onboarding — Brand Onboarding Confirmation](#3-platform-onboarding--brand-onboarding-confirmation)
4. [Platform Onboarding — Team Member Invitation](#4-platform-onboarding--team-member-invitation)
5. [Post-Login Routing](#5-post-login-routing)
6. [Route Protection (Middleware)](#6-route-protection-middleware)
7. [Post Detection — Ensemble Webhook](#7-post-detection--ensemble-webhook)
8. [Download Worker (Cron)](#8-download-worker-cron)
9. [Metrics Worker (Cron)](#9-metrics-worker-cron)
10. [Campaign Lifecycle](#10-campaign-lifecycle)
11. [Usage Rights Gate](#11-usage-rights-gate)
12. [Known Gaps & Dev Limitations](#12-known-gaps--dev-limitations)

---

## 1. Platform Onboarding — Agency Registration

**Route:** `/request-access` (Agency tab)
**Actions:** `lib/actions/agencies.ts` → `submitAgencyRequest`, `approveAgencyRequest`, `rejectAgencyRequest`
**Tables:** `agency_requests`, `agencies`, `users`

### Submission (unauthenticated)

1. Agency fills out the public `/request-access` form (Agency tab).
2. `submitAgencyRequest(data)` is called via Server Action:
   - Validates input with `agencyRequestSchema` (agency_name, website_url, contact_name, contact_email, description)
   - Uses **service client** (no auth required — public form)
   - INSERT `agency_requests(status='pending', ...fields)`
3. ⚠️ **No email sent** at this point (notification email planned, not yet implemented).

### Review & Approval (platform admin)

Platform admin logs in → auto-redirected to `/admin` → reviews at `/admin/agencies`.

**Approve:** `approveAgencyRequest(requestId)`
1. Verify calling user has `users.is_platform_admin = true`.
2. Fetch `agency_requests` row (must exist, status ≠ 'approved'/'rejected').
3. Look up `users.id` by `contact_email`:
   - Found → use as `owner_id`
   - Not found → fall back to the approving admin's `user.id` (agency owner must sign up separately)
4. INSERT `agencies(name, slug, owner_id, status='active')`
5. UPDATE `agency_requests(status='approved', reviewed_by, reviewed_at)`
6. Revalidate `/admin` paths.

**Reject:** `rejectAgencyRequest(requestId)`
- UPDATE `agency_requests(status='rejected', reviewed_by, reviewed_at)`

### Post-Approval

Agency owner logs in → `app/app/page.tsx` detects `agencies.owner_id = user.id` → redirects to `/agency/[slug]/dashboard`.

---

## 2. Platform Onboarding — Brand Request Flow

**Route:** `/request-access` (Brand tab)
**Actions:** `lib/actions/brand-requests.ts` → `submitBrandRequest`, `approveBrandRequest`, `rejectBrandRequest`
**Tables:** `brand_requests`, `workspaces`, `workspace_members`, `emv_config`

### Submission (unauthenticated)

1. Brand fills out the public `/request-access` form (Brand tab): brand_name, website_url, contact_name, contact_email, description, agency (dropdown — fetched via `getActiveAgenciesPublic()`).
2. `submitBrandRequest(data)` is called via Server Action:
   - Validates with `brandRequestSchema`
   - Uses **service client** (public, unauthenticated)
   - INSERT `brand_requests(status='pending', agency_id, ...fields)`
   - Fires email (fire-and-forget, SendGrid) to `AGENCY_NOTIFICATION_EMAIL` with brand details and link to `/agency/[slug]/requests`

### Review & Approval (agency owner/admin)

Agency user logs in → navigates to `/agency/[agencySlug]/requests`.

**Approve:** `approveBrandRequest(requestId, agencySlug)`
1. Verify caller is authenticated.
2. Fetch `brand_requests` row — validate status is still `'pending'` (race condition guard).
3. Generate workspace slug from brand_name (`toSlug(brand_name)` + suffix if taken).
4. INSERT `workspaces(name=brand_name, slug, logo_url, agency_id)`
5. INSERT `workspace_members(workspace_id, user_id=agency_user.id, role='owner')`
6. Call `seed_workspace_defaults(workspace_id)` RPC → populates default `emv_config` rows (one per platform).
7. Generate `onboard_token = randomBytes(32).toString('hex')`, `onboard_token_expires_at = now() + 30 days`.
8. UPDATE `brand_requests(status='approved', workspace_id, onboard_token, onboard_token_expires_at, reviewed_by, reviewed_at)`
9. Fire email (fire-and-forget, SendGrid) to `contact_email` with link → `/onboard/[token]`

**Reject:** `rejectBrandRequest(requestId, agencySlug)`
- UPDATE `brand_requests(status='rejected', reviewed_by, reviewed_at)`

> **Key principle:** The workspace is created at approval time, not at brand confirmation.

---

## 3. Platform Onboarding — Brand Onboarding Confirmation

**Route:** `/onboard/[token]`
**Page:** `app/onboard/[token]/page.tsx`
**Action:** `lib/actions/brands.ts` → `acceptBrandOnboarding(token)`
**Tables:** `brand_requests`, `workspace_members`

### Page Load

1. Service client queries `brand_requests` by `onboard_token`.
2. Validates:
   - Row found (if not → show "Link unavailable" error)
   - `status = 'approved'` (if not → "invalid or expired")
   - `onboard_token_expires_at > now()` (if expired → "link has expired")
3. Renders one of three states:
   - **Already confirmed** (`onboard_accepted_at` set): "Onboarding already confirmed" message.
   - **Not logged in**: "Sign in to confirm →" link → `/login?redirectTo=/onboard/[token]`
   - **Logged in + not confirmed**: "Confirm my onboarding" button (`ConfirmButton` client component)

### Confirmation

`acceptBrandOnboarding(token)` (Server Action, called by ConfirmButton):
1. Get current user via `createClient()` — redirect to `/login?redirectTo=/onboard/[token]` if unauthenticated.
2. Service client: reload `brand_requests` by `onboard_token` (re-validates status + expiry).
3. Verify `workspace_id` is present.
4. INSERT `workspace_members(workspace_id, user_id, role='brand')` — **idempotent**: ignore error code `23505` (duplicate key) so double-confirm is safe.
5. UPDATE `brand_requests(onboard_accepted_at=now())`.
6. Return `{ workspaceSlug }`.
7. `ConfirmButton` redirects to `/[workspaceSlug]/portal`.

### Portal Access

`app/(app)/[workspaceSlug]/(portal)/layout.tsx` validates `workspace_members.role = 'brand'`.
Brand users cannot access the dashboard (`/(dashboard)/`) — portal only.

---

## 4. Platform Onboarding — Team Member Invitation

**Routes:** Settings → Members → Invite; `/invite/[token]`
**Actions:** `lib/actions/workspace.ts` → `inviteMember`, `acceptInvitation`
**Page:** `app/invite/[token]/page.tsx`
**Tables:** `invitations`, `workspace_members`

### Sending an Invitation

`inviteMember(workspaceId, { email, role })`:
1. Auth: caller must be workspace member with `role` in `['owner', 'admin']`.
2. Guard: `email` must not already exist in `workspace_members` for this workspace.
3. Guard: invited `role` must not exceed caller's own role level.
4. INSERT `invitations(workspace_id, email, role, token=uuid, expires_at=now()+7days)`
5. Fire email (fire-and-forget, SendGrid) to `email` with link → `/invite/[token]`

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

## 5. Post-Login Routing

**File:** `app/app/page.tsx`
**Evaluated in order — first match wins:**

| Priority | Condition | Redirect |
|----------|-----------|----------|
| 1 | `users.is_platform_admin = true` | `/admin` |
| 2 | Active `agencies` row where `owner_id = user.id` | `/agency/[slug]/dashboard` |
| 3 | `workspace_members.role = 'brand'` in any workspace | `/[slug]/portal` |
| 4 | Any `workspace_members` row (most recent `joined_at`) | `/[slug]/overview` |
| 5 | No match | `/no-access` |

---

## 6. Route Protection (Middleware)

**File:** `proxy.ts` (Next.js 16 convention — not `middleware.ts`)

### Session Refresh

Supabase session is refreshed on every request (cookie sync via `@supabase/ssr`). No redirect occurs — this is purely session maintenance.

### Public Paths (no auth required)

```
/
/login
/signup
/auth/callback
/request-access
/onboard/*
/invite/*
/onboarding          ← dev only (disabled in production)
/no-access
/api/webhooks/*      ← auth via HMAC signature
/api/cron/*          ← auth via Bearer CRON_SECRET
```

### Auth Boundaries

| Boundary | File | Behaviour |
|----------|------|-----------|
| Dashboard | `app/(app)/[workspaceSlug]/(dashboard)/layout.tsx` | Validates `workspace_members` row exists for slug; redirects to `/no-access` if not a member |
| Portal | `app/(app)/[workspaceSlug]/(portal)/layout.tsx` | Validates `workspace_members.role = 'brand'`; redirects non-brand users |
| Agency | `app/agency/[agencySlug]/layout.tsx` | Validates `agencies.owner_id = user.id` for the slug |
| Admin | `app/admin/layout.tsx` | Validates `users.is_platform_admin = true` |

---

## 7. Post Detection — Ensemble Webhook

**Endpoint:** `POST /api/webhooks/ensemble`
**File:** `app/api/webhooks/ensemble/route.ts`
**Auth:** HMAC-SHA256 signature in `x-signature` header

### Flow

1. Receive POST from Ensemble.
2. Read raw body; verify HMAC-SHA256 signature using `verifyEnsembleSignature(rawBody, signature, ENSEMBLE_WEBHOOK_SECRET)` from `lib/utils/index.ts` (timing-safe comparison).
3. Parse JSON payload — identify platform, influencer handle, post URL, platform_post_id.
4. Look up matching `influencer` by handle + workspace.
5. Look up active `campaign_influencers` row (monitoring_status = 'active').
6. INSERT `posts(platform, platform_post_id, post_url, caption, posted_at, campaign_id, influencer_id, workspace_id, download_status='pending', metrics_fetch_after=posted_at+7days)`.
7. INSERT `retry_queue(job_type='download', post_id, status='pending', scheduled_at=now())`.
8. Return `200 OK` immediately (async processing via cron).

---

## 8. Download Worker (Cron)

**File:** `app/api/cron/download-worker/route.ts`
**Auth:** `Authorization: Bearer CRON_SECRET`
**Schedule:** Every 5 minutes (`vercel.json`; Free plan: every 30 min)

### Process

For each claimed job (up to 10 per run):

1. `claim_jobs({ p_job_type: 'download', p_limit: 10 })` RPC — atomically claims pending jobs from `retry_queue`.
2. Load post + campaign + influencer + workspace.
3. **Usage rights gate:** If `campaign_influencers.usage_rights = false` → skip (leave job in queue until rights are granted).
4. `fetchFreshMediaUrl(platform, platformPostId, postUrl)` → EnsembleData API:
   - **TikTok** `/tt/post/info`: extract `video.download_addr.url_list[0]` or `video.play_addr_h264.url_list[0]`
   - **Instagram** `/instagram/post/details`: prefer `data.video_url`, fallback to `data.display_url`
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

## 9. Metrics Worker (Cron)

**File:** `app/api/cron/metrics-worker/route.ts`
**Auth:** `Authorization: Bearer CRON_SECRET`
**Schedule:** Every 10 minutes (`vercel.json`; Free plan: merged into single cron)

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

## 10. Campaign Lifecycle

**File:** `lib/actions/campaigns.ts`
**Tables:** `campaigns`, `campaign_tracking_configs`, `campaign_influencers`

### Create

`createCampaign(workspaceId, data)`:
- Auth: workspace member with role in `['owner', 'admin', 'editor']`
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
- Auth: owner/admin/editor
- Schema: `trackingConfigSchema` (campaign_id, platform, hashtags[], mentions[])
- UPSERT `campaign_tracking_configs` on unique constraint `(campaign_id, platform)`
- **Required for post detection** — the webhook matches posts using these hashtags/mentions

---

## 11. Usage Rights Gate

**File:** `lib/actions/usage-rights.ts`
**Table:** `campaign_influencers`

`toggleUsageRights(campaignInfluencerId, value: boolean)`:
- Auth: workspace member with role in `['owner', 'admin', 'editor']`
- UPDATE `campaign_influencers(usage_rights=value, usage_rights_updated_at=now())`

**Effect on download worker:** If `usage_rights = false` for an influencer in a campaign, the download worker skips all their posts and leaves the job in the `retry_queue`. Once rights are granted and the cron runs again, the download proceeds.

---

## 12. Known Gaps & Dev Limitations

| # | Gap | Status |
|---|-----|--------|
| 1 | **Agency request email** | No email is sent when an agency submits a request or is approved. Planned but not implemented. |
| 2 | **Google Drive in local dev** | `GOOGLE_SERVICE_ACCOUNT_JSON_B64` is not set locally — Drive uploads will fail. Manually set `posts.download_status = 'downloaded'` in Supabase to test downstream flows. |
| 3 | **Vercel Free plan cron limit** | Free plan allows only 1 cron job. Currently: `posts-worker` runs every 30 min and handles both download + metrics. On Pro upgrade: restore to 3 separate crons at 5 min / 10 min intervals and set `maxDuration=300`. |
| 4 | **YouTube download** | YouTube posts are detected and metrics are fetched, but direct video download is not supported via EnsembleData. `download_status` stays `'pending'` perpetually for YouTube posts unless manually updated. |
| 5 | **Manual onboarding page** | `/onboarding` is a dev-only page for manually creating workspaces. It must be disabled (guarded or removed) before production deployment. |

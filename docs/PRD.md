# PRD — Instroom Post Tracker

**Version:** 2.0
**Status:** Active development
**Last updated:** April 2026
**Changes from v1.1:** Replaced 3-tier agency/brand hierarchy with Solo/Team self-serve account model. Removed agency registration flow. Removed brand portal. Replaced /request-access with /signup. Added workspace quota system and 14-day free trial.

---

## 1. Problem Statement

Influencer marketing agencies manage campaigns across multiple brand clients. After a campaign runs, tracking whether influencers actually posted — and collecting those posts for reporting — is almost entirely manual. Campaign managers currently:

- Manually search each influencer's social profile for campaign posts
- Screenshot or download content one by one
- Copy-paste metrics into spreadsheets
- Chase influencers about Instagram collab tags
- Lose hours assembling wrap reports

**This process takes 4–6 hours per campaign wrap-up.** It's error-prone, inconsistent, and doesn't scale beyond a handful of concurrent campaigns.

---

## 2. Solution

Instroom connects to **Ensemble** (a social monitoring API) and automatically:

1. **Detects** posts from monitored influencers that match campaign hashtags/mentions
2. **Downloads** them watermark-free to an organised Google Drive folder
3. **Blocks** download if usage rights haven't been granted (with a clear in-app warning)
4. **Fetches** performance metrics 7 days after publish (frozen snapshot — industry standard)
5. **Calculates** EMV per post using configurable CPM rates per platform
6. **Tracks** Instagram collab tag status per post

Campaign managers get a real-time dashboard and analytics at wrap-up — without any manual data collection.

---

## 3. Users

### Tier 1 — Platform Admin (Instroom)
- `is_platform_admin = true` in `public.users`
- Can see and manage all workspaces at `/admin`
- Can set plan (trial / free / pro) and `workspace_quota` per workspace
- Only a handful of accounts; set manually in DB

### Tier 2 — Account Owner (self-serve)
Two account types — both sign up at `/signup` without any approval:

**Solo account:** For individual campaign managers or single-brand users running their own campaigns in-house.
- 1 workspace included (`workspace_quota = 1`)
- Signs up → email verify → workspace auto-created → `/[slug]/overview`

**Team account:** For agencies or multi-brand users managing multiple clients.
- 3 workspaces included (`workspace_quota = 3`, expandable by platform admin)
- First workspace auto-created on email verify; additional workspaces created from settings
- 14-day full trial → permanent free tier unless upgraded to Pro

### Tier 2 — Workspace Members
Users invited to a workspace by the owner:
- **Manager** (DB value: `'manager'`): Can create/edit campaigns, manage influencers, toggle usage rights. Cannot invite members or change settings.
- **Viewer** (DB value: `'viewer'`): Read-only access to all dashboard data.

> **Shared workspaces:** An owner can grant Manager access to any user, or users can request access. Shared workspaces appear in the workspace switcher but never count toward the accessor's own quota.

---

## 4. Core Features

### 4.1 Multi-workspace (account model)

- Each account owns one or more **workspaces** (billing + isolation unit)
- **Workspace quota:** Solo accounts get 1; Team accounts get 3 by default (platform admin can raise per account)
- **Creating a workspace:** Owner creates from the workspace settings page — no external approval required. Gated by `workspace_quota`.
- **Shared workspaces:** Owner grants Manager access to another user via invite link. Shared workspaces are visible in the sidebar but never count toward the accessor's quota.
- Role system within each workspace: `owner` (Admin in UI) / `manager` / `viewer`
- Workspace switching from the sidebar without a full page reload

### 4.2 Campaigns

- Campaign defines: name, platforms (IG / TikTok / YouTube), start date, end date
- Status lifecycle: `draft` → `active` → `ended`
  - `ended` is triggered automatically by pg_cron at `end_date` or manually by the user
- Per-platform tracking config: hashtags + mentions to monitor
- Posts outside the campaign date window are discarded entirely (not saved)
- A post can match multiple campaigns simultaneously — one DB row per post-campaign pair

### 4.3 Influencer Management

- Influencers are scoped to a workspace (not global)
- Added manually via a form (IG handle, TikTok handle, YouTube handle, Ensemble ID)
- Added to specific campaigns via `campaign_influencers` join table
- **Usage rights are toggled per campaign-influencer, not globally** — same influencer can have rights for campaign A but not B

### 4.4 Post Detection (Polling — posts-worker)

Railway runs `workers/src/posts-worker.ts` daily at 4 PM UTC:

1. Load all active campaign-influencer targets (`monitoring_status IN ('pending', 'active')`)
2. For each target, scrape recent posts from EnsembleData per platform (IG posts + reels, TikTok, YouTube)
3. Filter: within campaign date window AND caption matches tracking config (hashtag/mention)
4. Deduplicate: `UNIQUE(platform_post_id, campaign_id)` — `ON CONFLICT DO NOTHING`
5. Save post; set `download_status` based on `usage_rights`:
   - `false` → `blocked`, `blocked_reason: no_usage_rights`
   - `true` → `pending`, enqueue download job in `retry_queue`
6. `collab_status` is set by DB trigger: `n/a` for TikTok/YouTube, `pending` for Instagram
7. After first run, set `monitoring_status = 'active'` (switches to shallow-depth scraping)

### 4.5 Content Download

- Download via EnsembleData API — uses TikTok's internal `download_addr` CDN stream, which provides the highest available quality and avoids the in-app "Save video" compression
- **Watermark reality (verified 2026-03-23):** TikTok's `download_addr` CDN URL still bakes in the creator handle overlay (`TikTok @handle`) in the corner of the video. This is not a post-processing watermark — it is burned into the CDN stream itself. Truly watermark-free content requires either:
  1. The influencer shares the original file directly (recommended for campaign wrap reports)
  2. A TikTok official business API partnership (not publicly available)
  - EnsembleData has no dedicated no-watermark endpoint for TikTok
- **Instagram** downloads from `/instagram/post/details` (`video_url`) are clean — no platform watermark
- Upload to Google Drive at path: `/{workspace.name}/{campaign.name}/{influencer.handle}/{platform}/`
- Failed downloads go into `retry_queue` (up to 3 retries, 15-min backoff)
- Store `drive_file_id` and `drive_folder_path` on the post record

### 4.6 Usage Rights Gate

- Toggle lives on `campaign_influencers.usage_rights` (default: `false`)
- Toggling **OFF**: future posts for this influencer in this campaign will be blocked
- Toggling **ON**: only *new* incoming posts will be downloaded — previously blocked posts remain blocked
  - This is intentional (see D-004 in DECISIONS.md)
  - Manual retry is available on the posts table (v2 feature)

### 4.7 Analytics

- Metrics fetched exactly once, 7 days post-publish
- **Metrics are frozen** — never updated after initial write
- `emv_cpm_used` stored alongside EMV so historical values don't drift if CPM config changes
- Per-workspace CPM config (`emv_config` table) with seeded defaults
- Analytics page shows: post volume over time, platform breakdown, EMV by influencer, ER vs benchmark, influencer leaderboard

### 4.8 Instagram Collab Tag Tracking

- All Instagram posts default to `collab_status: pending`
- Team can mark as `confirmed` or `not_added` inline in the posts table
- TikTok/YouTube posts default to `n/a` — collab controls are hidden for these platforms

### 4.9 Google Drive Integration

- **Flexible model** — Drive connection is configured per workspace at setup time:
  - **Agency Drive:** Agency connects their own Google account via OAuth. All brand folders live under the agency's Drive
  - **Brand Drive:** Agency connects the brand's Google account via OAuth on behalf of the brand. Folders live in the brand's Drive
- Drive connection is set during workspace setup (post-approval) and can be changed in workspace settings
- `drive_connection_type` stored per workspace: `agency` or `brand`
- Folder structure is auto-created on first upload per path
- `drive_folder_path` stored on each post for direct linking

---

## 5. Pages & Routes

| Route | Page | Auth required |
|-------|------|---------------|
| `/` | Marketing landing page (SSG) | No |
| `/login` | Email + password sign-in | No |
| `/signup` | Self-serve account creation (Solo or Team) | No |
| `/onboarding/name` | Google OAuth fallback: collect account name | No (post-auth only) |
| `/upgrade` | Plan upgrade request page | No |
| `/onboarding` | Manual workspace creation (DEV ONLY — disable in production) | Yes |
| `/invite/[token]` | Team member invitation acceptance | Optional |
| `/admin` | Platform admin dashboard (Instroom-only) | Yes + `is_platform_admin` |
| `/admin/agencies` | All workspaces + plan management | Yes + `is_platform_admin` |
| `/[slug]/overview` | Dashboard overview | Yes |
| `/[slug]/campaigns` | Campaign list | Yes |
| `/[slug]/campaigns/[id]` | Campaign detail | Yes |
| `/[slug]/influencers` | Workspace influencer roster | Yes |
| `/[slug]/posts` | All posts across campaigns | Yes |
| `/[slug]/analytics` | Analytics charts | Yes |
| `/[slug]/settings` | Workspace settings + members | Yes |

---

## 9. Account Model (v2.0)

### Self-Serve Signup Flow

1. User visits `/signup`, selects Solo or Team, enters `account_name`, email, password
2. `signUp()` stores `{ account_type, account_name }` in Supabase `user_metadata`; sends email verification
3. User clicks email link → `app/auth/callback/route.ts` → `handlePostAuth()`:
   - Creates `workspaces { plan='trial', trial_ends_at=now()+14d, account_type, workspace_quota }`
   - Solo: `workspace_quota = 1`; Team: `workspace_quota = 3`
   - Inserts `workspace_members(role='owner')`
4. Redirects to `/[workspaceSlug]/overview`

**Google OAuth edge case:** If `account_name` is missing (Google OAuth skips the form), redirect to `/onboarding/name` to collect it.

### Post-Login Redirect Logic (`app/app/page.tsx`)
1. `is_platform_admin = true` → `/admin`
2. Any `workspace_members` row → `/[slug]/overview` (most recent `joined_at`)
3. No match → `/no-access`

---

## 6. Out of Scope — All Versions

- **Full dashboard access for brands** — brands only access the read-only `/portal` route
- Direct brand viewer role for the agency dashboard
- Direct Instagram/TikTok/YouTube API (Ensemble handles all social access)
- Influencer discovery / prospecting
- Contract management
- Payment / invoice tracking
- PDF or Excel export of analytics
- Bulk influencer import via CSV
- Retroactive download of previously blocked posts (manual retry is v2)
- Email notifications for new posts detected
- Token regeneration for expired brand invitations

## 7. Out of Scope for v1 Only

- Mobile-responsive layout (minimum supported width: 1024px)
- Email sending for brand request approval/rejection notifications (v1: agency manually notifies brand)
- Automated email for staff invitations (v1: invitation link copied manually)

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Campaign post collection time | < 5 minutes (vs 4–6 hours manual) |
| Post detection coverage | > 95% (Ensemble SLA-dependent) |
| Download success rate | 100% for posts with usage rights |
| Analytics dashboard load | < 2 seconds |
| Zero missed downloads | For all influencers with `usage_rights = true` |
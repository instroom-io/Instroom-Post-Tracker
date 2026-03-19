# PRD — Instroom Post Tracker

**Version:** 1.1
**Status:** Active development
**Last updated:** March 2026
**Changes from v1.0:** Removed brand login entirely. Replaced agency-generated invite link with brand-initiated request form + agency approval flow. Updated Google Drive to flexible model. Added `/request-access` public route.

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
- Can see and manage all agencies at `/admin`
- Reviews and approves/rejects agency registration requests (`agency_requests` table)
- Only one or a handful of accounts; set manually in DB

### Tier 2 — Agency
- Submits an agency request at `/request-access` (Agency tab) → platform admin approves
- Owns and operates their own sub-platform under `/agency/[agencySlug]/*`
- Reviews incoming brand requests from their brands at `/agency/[slug]/requests`
- Manages all their brand workspaces, campaigns, and influencers
- Pain point: hours wasted manually collecting posts across all client campaigns

### Tier 3 — Agency Staff (Campaign Manager / Community Manager)
- Works inside one or more brand workspaces on behalf of the agency
- Manages 3–15 active campaigns for a brand
- Needs to prove campaign ROI with post-level analytics
- Assigned to a workspace by the agency owner (`owner` / `admin` / `editor` / `viewer`)

### Tier 3 — Brand (Read-only portal)
- Brands submit a connection request at `/request-access` (Brand tab), selecting the agency
- After agency approval they receive an onboarding link via email → `/onboard/[token]`
- Brand signs in and clicks Confirm → gets `role='brand'` in `workspace_members`
- Brand can view a read-only portal at `/[workspaceSlug]/portal`
- Brands never access the full agency dashboard

> **Note:** The multi-agency platform adds a Instroom → Agencies → Brands 3-tier hierarchy. See §9 for the full platform flows.

---

## 4. Core Features

### 4.1 Multi-workspace (agency model)

- **Instroom** is the platform operator (tier 1) — manages all agencies
- Each **marketing agency** (tier 2) gets their own sub-platform under `/agency/[agencySlug]`
- Each **brand client** (tier 3) = one isolated workspace with its own campaigns, influencers, EMV config, and Google Drive folder
- **Workspace creation flow:**
  1. Brand submits a connection request via the public `/request-access` form (Brand tab) — selects an agency
  2. Agency reviews the request at `/agency/[slug]/requests`
  3. Agency approves → workspace is auto-created immediately; `onboard_token` generated and emailed to brand contact
  4. Brand clicks email link → `/onboard/[token]` → signs in → Confirms → gets `role='brand'` in `workspace_members`
  5. Brand is redirected to their read-only portal `/[slug]/portal`
- **Brand portal:** Brands with `role='brand'` can view a read-only portal — recent posts, Drive status. They cannot access the full agency dashboard
- Role system for agency staff within each workspace: `owner` / `admin` / `editor` / `viewer`
- Agency staff can be invited to workspaces via workspace settings
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

Cron runs every 30 minutes (`GET /api/cron/posts-worker`):

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

- Download via Ensemble API (no watermark)
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
| `/signup` | Account creation | No |
| `/request-access` | Public form — Brand tab + Agency tab | No |
| `/onboard/[token]` | Brand onboarding acceptance (signs in + confirms) | Yes (redirect to login if not) |
| `/onboarding` | Manual workspace creation (DEV ONLY — disable in production) | Yes |
| `/invite/[token]` | Agency staff invitation acceptance | Optional |
| `/admin` | Platform admin dashboard (Instroom-only) | Yes + `is_platform_admin` |
| `/admin/agencies` | All agencies + agency request review | Yes + `is_platform_admin` |
| `/admin/agencies/[agencyId]` | Agency detail | Yes + `is_platform_admin` |
| `/agency/[agencySlug]/dashboard` | Agency overview | Yes + agency owner |
| `/agency/[agencySlug]/brands` | Agency's workspaces | Yes + agency owner |
| `/agency/[agencySlug]/requests` | Brand request queue (approve/reject) | Yes + agency owner |
| `/agency/[agencySlug]/settings` | Agency settings | Yes + agency owner |
| `/[slug]/overview` | Dashboard overview | Yes |
| `/[slug]/campaigns` | Campaign list | Yes |
| `/[slug]/campaigns/[id]` | Campaign detail | Yes |
| `/[slug]/influencers` | Workspace influencer roster | Yes |
| `/[slug]/posts` | All posts across campaigns | Yes |
| `/[slug]/analytics` | Analytics charts | Yes |
| `/[slug]/settings` | Workspace settings + members | Yes |
| `/[slug]/portal` | Read-only brand portal (`role='brand'` only) | Yes |

---

## 9. Multi-Agency Platform Architecture

### 3-Tier Hierarchy

```
Instroom (platform admin)
  └── Agencies  (/agency/[agencySlug]/*)
        └── Brand Workspaces  (/[workspaceSlug]/*)
              └── Brand Portal  (/[workspaceSlug]/portal)
```

### Agency Request Flow

1. Agency submits form at `/request-access` (Agency tab) — name, website, contact
2. `submitAgencyRequest()` creates a row in `agency_requests` (status: `pending`)
3. Platform admin reviews at `/admin` or `/admin/agencies`
4. Platform admin approves → `approveAgencyRequest()`:
   - Creates `agencies` row (status: `active`)
   - If agency contact has signed up: `owner_id` = their user ID; else: falls back to approving admin as temporary owner
5. Agency owner logs in → auto-redirected to `/agency/[slug]/dashboard`

### Brand Request Flow (via Agency)

1. Brand fills `/request-access` (Brand tab) — selects agency from dropdown
2. `submitBrandRequest()` creates `brand_requests` row linked to `agency_id` (status: `pending`)
3. Agency reviews at `/agency/[slug]/requests`
4. Agency approves → `approveBrandRequest()`:
   - Creates `workspaces` row (`agency_id` FK set)
   - Adds approving agency user as `owner` in `workspace_members`
   - Seeds default EMV config
   - Generates `onboard_token` (32-byte hex), stores on `brand_requests`
   - Sends email to brand contact with link → `/onboard/[token]`
5. Brand rejects → `status = 'rejected'`, brand notified via email

### Brand Onboarding Flow

1. Brand receives email with link → `/onboard/[token]`
2. If not logged in: page shows sign-in prompt; redirects back after auth
3. Brand clicks "Confirm my onboarding" → `acceptBrandOnboarding()`:
   - Validates token (exists, not expired, not already accepted)
   - Inserts `workspace_members(role='brand')` — idempotent (ON CONFLICT DO NOTHING)
   - Marks `onboard_accepted_at`
   - Returns `workspaceSlug`
4. Brand redirected to `/[slug]/portal`
5. Future logins: `app/app/page.tsx` detects `role='brand'` → auto-redirects to portal

### Post-Login Redirect Logic (`app/app/page.tsx`)

1. `is_platform_admin = true` → `/admin`
2. Active agency owner → `/agency/[slug]/dashboard`
3. `role='brand'` membership → `/[slug]/portal`
4. Regular member → most recent `/[slug]/overview`
5. No access → `/no-access`

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
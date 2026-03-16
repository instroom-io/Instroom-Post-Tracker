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

### Primary — Marketing Agency (Super Admin)
- Owns and operates the entire Instroom instance
- Reviews incoming brand connection requests and approves or rejects them
- Manages all brand workspaces from the agency dashboard
- Sets up campaigns, influencers, and tracking for each brand client
- Pain point: hours wasted manually collecting posts across all client campaigns

### Secondary — Campaign manager / community manager (Agency staff)
- Works inside one or more brand workspaces on behalf of the agency
- Manages 3–15 active campaigns for a brand
- Needs to prove campaign ROI with post-level analytics
- Assigned to a workspace by the agency owner

> **Note:** Brands have no login to Instroom — not in v1, not in v2. The agency manages everything on behalf of their brand clients. Brands interact with Instroom only via the public `/request-access` form to initiate a connection.

---

## 4. Core Features

### 4.1 Multi-workspace (agency model)

- The **marketing agency** is the super admin — they manage all brand workspaces
- Each **brand client** = one isolated workspace with its own campaigns, influencers, EMV config, and Google Drive folder
- **Workspace creation flow:**
  1. Brand submits a connection request via the public `/request-access` form (no login required)
  2. Agency reviews the request in their dashboard (pending requests list)
  3. Agency approves → workspace is auto-created from the request data
  4. Agency rejects → brand is notified (email), request is closed
- **Brands never log in to Instroom.** There is no brand-facing portal, viewer role, or read-only access — now or in future versions
- Role system within each workspace applies to **agency staff only**: `owner` / `admin` / `editor` / `viewer`
- Agency staff can be invited to workspaces via workspace settings (Flow 6)
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

### 4.4 Post Detection (Ensemble webhook)

Pipeline on every inbound webhook event:

1. Verify HMAC-SHA256 signature with `ENSEMBLE_WEBHOOK_SECRET`
2. Match to active campaigns by hashtag/mention + date window
3. Deduplicate: `UNIQUE(ensemble_post_id, campaign_id)` — `ON CONFLICT DO NOTHING`
4. Save post with `download_status: pending`
5. Check `usage_rights` on `campaign_influencers`:
   - `false` → set `download_status: blocked`, `blocked_reason: no_usage_rights`, stop
   - `true` → enqueue download job in `retry_queue`
6. `collab_status` is set by DB trigger: `n/a` for TikTok/YouTube, `pending` for Instagram

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
| `/request-access` | Public brand connection request form | No |
| `/onboarding` | Manual workspace creation (DEV ONLY — disable in production) | Yes |
| `/invite/[token]` | Agency staff invitation acceptance | Optional |
| `/[slug]/overview` | Dashboard overview | Yes |
| `/[slug]/campaigns` | Campaign list | Yes |
| `/[slug]/campaigns/[id]` | Campaign detail | Yes |
| `/[slug]/influencers` | Workspace influencer roster | Yes |
| `/[slug]/posts` | All posts across campaigns | Yes |
| `/[slug]/analytics` | Analytics charts | Yes |
| `/[slug]/settings` | Workspace settings + members | Yes |
| `/agency/requests` | Pending brand connection requests (agency only) | Yes |

> **Removed:** `/onboard/[token]` — no longer needed. Brand onboarding is replaced by the `/request-access` public form + agency approval flow.

---

## 6. Out of Scope — All Versions

- **Brand login of any kind** — brands never access Instroom directly, not in v1, not in v2
- Brand viewer role or read-only portal
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
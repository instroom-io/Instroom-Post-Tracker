# PRD — Instroom Post Tracker

**Version:** 1.0  
**Status:** Active development  
**Last updated:** March 2026

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

Campaign managers get a real-time dashboard, and analytics at wrap-up — without any manual data collection.

---

## 3. Users

### Primary — Marketing Agency (Super Admin)
- Manages the Instroom instance as a whole
- Creates brand entries and generates onboarding links per brand client
- Monitors all brand workspaces from an agency-level view
- Pain point: hours wasted manually collecting posts across all client campaigns

### Secondary — Campaign manager / community manager (Brand Admin or Editor)
- Works inside a single brand workspace
- Manages 3–15 active campaigns for that brand
- Needs to prove campaign ROI with post-level analytics
- Onboarded via agency-generated link — workspace is auto-created on acceptance

### Tertiary — Agency account lead / director
- Reviews analytics dashboards before client presentations
- Read-only access most of the time
- Needs EMV totals and engagement summaries fast

### Quaternary — Brand client (viewer role)
- May be given view-only access to their own workspace
- Does not create campaigns or manage influencers
- Reviews results, not inputs

---

## 4. Core Features

### 4.1 Multi-workspace (agency model)

- The **marketing agency** is the super admin — they manage all brand workspaces
- Each **brand client** = one isolated workspace with its own campaigns, influencers, EMV config, and Google Drive folder
- **Workspace creation is agency-triggered:** The agency generates a unique onboarding link per brand. The workspace is auto-created when the brand admin clicks the link and accepts (`/onboard/[token]`). Brands never create workspaces manually
- Role system within each workspace: `owner` / `admin` / `editor` / `viewer`
- Brand admins can invite their own team members via workspace settings (Flow 6)
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
  - This is intentional (see D-004 in DECISIONS.md) — usage rights must be confirmed before campaign launch
  - Manual retry is available on the posts table (future feature)

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

- Service account (not per-user OAuth) — one account per Instroom instance
- Folder structure is auto-created on first upload per path
- Root folder per workspace, campaign and influencer subfolders auto-created
- `drive_folder_path` stored on each post for direct linking

---

## 5. Pages & Routes

| Route | Page | Auth required |
|-------|------|---------------|
| `/` | Marketing landing page (SSG) | No |
| `/login` | Email + password sign-in | No |
| `/signup` | Account creation | No |
| `/onboard/[token]` | Brand onboarding acceptance (PRODUCTION — auto-creates workspace) | Optional (auth gate inside page) |
| `/onboarding` | Manual workspace creation (DEV ONLY — disable in production) | Yes (no workspace yet) |
| `/invite/[token]` | Team member invitation acceptance | Optional |
| `/[slug]/overview` | Dashboard overview | Yes |
| `/[slug]/campaigns` | Campaign list | Yes |
| `/[slug]/campaigns/[id]` | Campaign detail | Yes |
| `/[slug]/influencers` | Workspace influencer roster | Yes |
| `/[slug]/posts` | All posts across campaigns | Yes |
| `/[slug]/analytics` | Analytics charts | Yes |
| `/[slug]/settings` | Workspace settings + members | Yes |

---

## 6. Out of Scope for v1

- Direct Instagram/TikTok/YouTube API (Ensemble handles all social access)
- Influencer discovery / prospecting
- Contract management
- Payment / invoice tracking
- PDF or Excel export of analytics
- Public-facing client portal (clients get viewer access via workspace invite)
- Mobile-responsive layout (minimum supported width: 1024px)
- Bulk influencer import via CSV
- Retroactive download of previously blocked posts (manual retry is v2)
- Email notifications for new posts detected

---

## 7. Success Metrics

| Metric | Target |
|--------|--------|
| Campaign post collection time | < 5 minutes (vs 4–6 hours manual) |
| Post detection coverage | > 95% (Ensemble SLA-dependent) |
| Download success rate | 100% for posts with usage rights |
| Analytics dashboard load | < 2 seconds |
| Zero missed downloads | For all influencers with `usage_rights = true` |

---

## 8. Non-Functional Requirements

| Requirement | Detail |
|-------------|--------|
| **Security** | RLS on all tables; service role key never exposed to client; HMAC webhook verification |
| **Reliability** | pg_cron for scheduled jobs; retry queue with 3× backoff for failed downloads |
| **Performance** | Parallel Supabase queries in Server Components; indexes on all FK + filter columns |
| **Scalability** | Multi-tenant from day one; no shared state between workspaces at application layer |
| **Observability** | Supabase logs + Vercel logs for v1; structured error returns from all Server Actions |
| **Data integrity** | Frozen metrics; `emv_cpm_used` stored per post; campaign date constraints enforced at DB level |

# WORKFLOWS.md — Instroom Post Tracker

> System workflows: how data moves through the application end-to-end.

---

## 1. Post Detection & Download

### 1.1 Post Ingestion (Ensemble Webhook)

1. Ensemble detects a new post matching a tracked handle/hashtag
2. POST request to `/api/webhooks/ensemble` with HMAC-SHA256 signature
3. `route.ts` verifies signature using `verifyEnsembleSignature()` (`lib/utils/index.ts`)
4. Post is inserted into `posts` with `download_status = 'pending'`
5. Webhook returns 200 immediately

### 1.2 Download Worker (Cron)

- **Schedule:** Every 5 min (`/api/cron/download-worker`)
- Selects posts with `download_status = 'pending'` where usage rights are enabled for the influencer
- Fetches watermark-free media URL from Ensemble API
- Uploads to Google Drive via service account (`lib/drive/upload.ts`)
- Updates post: `download_status = 'downloaded'`, `drive_file_id`, `drive_url`
- If usage rights are NOT enabled: post stays `pending` — download is gated

### 1.3 Usage Rights Gate

- Per influencer, per campaign: `campaign_influencers.usage_rights_enabled` boolean
- Toggled by agency via `toggleUsageRights()` in `lib/actions/usage-rights.ts`
- Download worker skips posts for influencers where this is `false`

---

## 2. Metrics Fetching

### 2.1 Metrics Worker (Cron)

- **Schedule:** Every 10 min (`/api/cron/metrics-worker`)
- Selects posts where `posted_at` is ≥ 7 days ago AND `metrics_fetched_at IS NULL`
- Fetches performance metrics from Ensemble API (likes, comments, views, shares, saves)
- Updates post: stores metrics as JSONB, sets `metrics_fetched_at = now()`
- Metrics are **frozen** — never updated after the initial fetch
- Also inserts jobs into `retry_queue` with `job_type = 'metrics_fetch'` for retry logic

### 2.2 EMV Calculation

- Calculated at query time from metrics + CPM rates stored in `emv_config`
- Formula: `(views / 1000) * cpm_rate` per platform
- CPM rates are workspace-level, configurable via Settings → EMV Settings

---

## 3. Campaign Lifecycle

### 3.1 Campaign States

```
draft → active → ended
```

- `draft`: created but not tracking
- `active`: tracking enabled, download worker processes posts
- `ended`: tracking stopped (manual or auto via `campaign_auto_end` DB trigger)

### 3.2 Auto-End Trigger

A Postgres trigger `campaign_auto_end` fires on UPDATE to `campaigns`:
- If `new.end_date < current_date AND new.status = 'active'` → sets `status = 'ended'`
- **Important:** You cannot activate a campaign with a past `end_date` via the UI

### 3.3 Influencer Tracking Config

Each campaign-influencer pair has a `tracking_config` JSONB column:
- Defines which handles/hashtags to monitor for that influencer
- Download worker **requires** a tracking config — posts are not scraped if config is absent

---

## 4. Brand Onboarding

### 4.1 Brand Request Flow (Production Path)

1. Brand fills `/request-access` (unauthenticated public form)
2. `submitBrandRequest()` inserts into `brand_requests` with `status = 'pending'`
3. **[PLANNED — not yet implemented]** Email sent to `AGENCY_NOTIFICATION_EMAIL` notifying agency of new request
4. Agency reviews at `/agency/requests` dashboard
5. Agency clicks Approve → `approveBrandRequest()`:
   - Creates workspace (`workspaces` table)
   - Adds approving user as `owner` in `workspace_members`
   - Seeds default EMV config via `seed_workspace_defaults` RPC
   - Generates `onboard_token` (32-byte hex), stores on `brand_requests`
   - **[PLANNED]** Sends confirmation email to `contact_email` with link → `/onboard/[token]`
   - Updates `brand_requests.status = 'approved'`
6. Brand clicks confirmation link → `/onboard/[token]` page
   - **[PLANNED]** Marks `onboard_accepted_at` — acknowledgment only, no account creation

### 4.2 Agency-Initiated Brand Invite (Legacy Flow)

1. Agency creates a brand entry via `createBrand()` in `lib/actions/brands.ts`
2. Token generated and stored in `brand_invitations` table
3. Link: `/onboard/[token]` — **page not yet built for this path**
4. `acceptBrandInvitation()` (stubbed in `lib/actions/brands.ts`) accepts the token

> Note: `/onboard/[token]` will support **dual-lookup** — checks `brand_requests.onboard_token` first, then `brand_invitations.token` — so both flows share the same URL.

### 4.3 Team Member Invitation

1. Agency member goes to Settings → Members → Invite
2. `inviteMember()` inserts into `invitations` with DB-generated token
3. **[PLANNED]** Email sent to invitee with link → `/invite/[token]`
4. Invitee clicks link → `/invite/[token]` page
5. If not logged in: redirected to login/signup, then back to accept
6. `acceptInvitation()` creates `workspace_members` row with the specified role

---

## 5. Workspace Access Control

### 5.1 Auth Boundary

- `app/(app)/[workspaceSlug]/(dashboard)/layout.tsx` is the auth boundary
- Validates: user is authenticated AND has a `workspace_members` row for the slug
- Redirects to `/login` if not authenticated
- Redirects to `/no-access` if authenticated but not a member

### 5.2 Role Hierarchy

```
owner > admin > editor > viewer
```

- `owner`: full access, can delete workspace, manage members
- `admin`: manage campaigns, influencers, settings (not member deletion of owners)
- `editor`: create/edit campaigns and influencers, toggle usage rights
- `viewer`: read-only

### 5.3 Post-Login Redirect

- `app/app/page.tsx` checks for user's most recent workspace membership
- If found: redirects to `/{workspaceSlug}/overview`
- If no workspace: redirects to `/no-access`

---

## 6. Email Notifications (Planned — not yet implemented)

> See `docs/superpowers/specs/` (when written) and plan at `.claude/plans/adaptive-wondering-dahl.md`.

Three flows will use `@sendgrid/mail` with fire-and-forget calls in Server Actions:

| Trigger | Recipient | Content |
|---------|-----------|---------|
| Brand request submitted | Agency (`AGENCY_NOTIFICATION_EMAIL`) | Brand details + link to `/agency/requests` |
| Brand request approved | Brand contact email | Confirmation link → `/onboard/[token]` |
| Team member invited | Invited email address | Invite link → `/invite/[token]` |

**New env vars required:** `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `AGENCY_NOTIFICATION_EMAIL`

---

## 7. Google Drive Integration

### 7.1 Folder Structure

```
[Drive Root]/
  [Workspace Name]/
    [Campaign Name]/
      [Influencer Handle]/
        [post-id].[ext]
```

### 7.2 Service Account

- All Drive operations use a service account (not per-user OAuth)
- Credentials: `GOOGLE_SERVICE_ACCOUNT_JSON_B64` (base64 of JSON key file)
- Shared Drive or a folder shared with the service account email

### 7.3 Dev Limitation

`GOOGLE_SERVICE_ACCOUNT_JSON_B64` is empty in dev → download worker always fails → manually set `download_status = 'downloaded'` in Supabase for testing.

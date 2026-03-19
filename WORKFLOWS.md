# Workflows — Instroom

> **Detailed step-by-step flows for all data pipelines.**
> Read before touching: the brand request handler, workspace creation, download worker, metrics worker, or campaign lifecycle code.

---

## 0A. Agency Registration Flow ✨ NEW

**Triggered by:** Agency submitting the Agency tab at `/request-access`
**Auth:** None required for submission. Platform admin must be logged in to approve.
**Supabase client:** `createServiceClient()` in `lib/actions/agencies.ts`

### Step-by-step

**Step 1 — Agency submits registration request**
Agency navigates to `/request-access` and clicks the Agency tab. Fields: agency name, website, contact name, contact email, description. `submitAgencyRequest()` inserts into `agency_requests` (status: `pending`).

**Step 2 — Platform admin reviews**
Platform admin logs in → auto-redirected to `/admin`. Reviews `agency_requests` at `/admin/agencies` (status: `pending`).

**Step 3 — Platform admin approves or rejects**

*Reject path:* `rejectAgencyRequest()` → `status = 'rejected'`, `reviewed_by`, `reviewed_at` set.

*Approve path:* `approveAgencyRequest()`:
1. Look up `auth.users` by `contact_email` — use their `user_id` as `owner_id` if found; else fall back to approving admin (see D-023)
2. Insert `agencies` row: `{ name, slug, owner_id, status: 'active' }`
3. Mark `agency_requests.status = 'approved'`

**Step 4 — Agency owner logs in**
`app/app/page.tsx` detects the user is an agency `owner_id` → redirects to `/agency/[slug]/dashboard`.

---

## 0. Brand Connection Request & Workspace Auto-Creation

**Triggered by:** Brand submitting the public `/request-access` form
**Auth:** None required for form submission. Agency staff must be logged in to approve.
**Supabase client:** `createServiceClient()` — workspace creation crosses user boundaries

> **Architecture context**
> Instroom is built for marketing agencies. The agency owns and operates the entire platform. Brands never log in — not in v1, not in any future version. Each brand becomes an isolated workspace, auto-created when the agency approves a brand's connection request.
>
> **Previous design (removed):** An agency-generated invite link flow (`/onboard/[token]`) was the original design. This has been replaced by a brand-initiated request form + agency approval flow. The `brand_invitations` table and `/onboard/[token]` route are no longer used in production.
>
> Flow 5 (manual workspace creation) exists **for local development only** and must not be accessible in production.

### Actors
- **Brand** — submits a connection request via `/request-access` (no login required)
- **Agency** — reviews pending requests in `/agency/requests` and approves or rejects

### Step-by-step

**Step 1 — Brand submits connection request**

Brand navigates to `https://app.instroom.co/request-access` and fills in the Brand tab.

Form fields:
- Brand name (required)
- Website URL (required)
- Contact name (required)
- Contact email (required)
- Agency (required — dropdown populated by `getActiveAgenciesPublic()`)
- Brief description of campaign needs (optional)

On submit, the system creates a `brand_requests` record (with `agency_id` set):

```sql
INSERT INTO brand_requests (
  brand_name, website_url, contact_name, contact_email,
  description, status
)
VALUES ($brand_name, $website_url, $contact_name, $contact_email, $description, 'pending')
RETURNING id
```

The brand sees a confirmation screen: *"Your request has been received. We'll be in touch soon."*

> **v2 TODO:** Auto-send confirmation email to `contact_email` via Resend/Postmark. In v1, no email is sent automatically — agency notifies the brand manually.

**Step 2 — Agency reviews pending requests**

Agency owner logs in and navigates to `/agency/[agencySlug]/requests`. The page lists all `brand_requests` with `status = 'pending'` and `agency_id = <this agency>`, showing brand name, website, contact, and description.

```sql
SELECT * FROM brand_requests
WHERE status = 'pending'
ORDER BY created_at ASC
```

**Step 3 — Agency approves or rejects**

**Reject path:**
```sql
UPDATE brand_requests SET status = 'rejected', reviewed_at = now(), reviewed_by = $user_id
WHERE id = $request_id
```
Request disappears from the pending list. In v1, agency manually notifies the brand by email.

**Approve path** → continues to Step 4.

**Step 4 — Workspace auto-created on approval**

`approveBrandRequest(requestId)` Server Action (uses **service client** in `lib/actions/brand-requests.ts`):

```sql
BEGIN TRANSACTION;

-- 1. Re-validate request is still pending
SELECT * FROM brand_requests WHERE id = $request_id AND status = 'pending';

-- 2. Generate slug from brand name
-- toSlug(brand_name) — append random suffix if slug already taken

-- 3. Auto-create workspace from request data (with agency_id)
INSERT INTO workspaces (name, slug, agency_id)
VALUES ($brand_name, $slug, $agency_id)
RETURNING id;

-- 4. Add approving agency user as workspace owner
INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES ($workspace_id, $agency_user_id, 'owner');

-- 5. Seed default EMV CPM rates
CALL seed_workspace_defaults($workspace_id);

-- 6. Generate onboard_token and store on request
UPDATE brand_requests
SET status = 'approved', workspace_id = $workspace_id,
    onboard_token = $token, onboard_token_expires_at = now() + interval '30 days',
    reviewed_at = now(), reviewed_by = $agency_user_id
WHERE id = $request_id;

-- 7. Send email to brand contact with /onboard/[token] link (SendGrid)

COMMIT;
```

Agency is redirected to the new workspace: `/{workspace_slug}/overview`.
Brand receives email with link to `/onboard/[token]`.

**Step 4B — Brand accepts onboarding**

Brand clicks email link → `/onboard/[token]`:
- If not logged in: page shows sign-in/signup prompt → redirects back after auth
- Brand clicks "Confirm my onboarding" → `acceptBrandOnboarding(token)`:
  1. Validate token: exists on `brand_requests`, not expired, not already accepted
  2. `INSERT INTO workspace_members (workspace_id, user_id, role='brand') ON CONFLICT DO NOTHING`
  3. `UPDATE brand_requests SET onboard_accepted_at = now()`
  4. Return `workspaceSlug`
- Brand redirected to `/[workspaceSlug]/portal`

> **v2 TODO:** Auto-send approval notification email to `brand_requests.contact_email` via Resend/Postmark. In v1, agency notifies the brand manually.

**Step 5 — Agency configures the workspace**

After the workspace is created, the agency:
1. Connects Google Drive (agency Drive or brand Drive — see Step 6)
2. Creates campaigns
3. Adds influencers
4. Configures Ensemble tracking

**Step 6 — Google Drive connection**

Drive is connected per workspace in `/[slug]/settings`. Two options:

| Option | When to use | How |
|--------|-------------|-----|
| `agency` | Agency owns the Drive | Agency connects their Google account via OAuth |
| `brand` | Brand wants files in their own Drive | Agency connects the brand's Google account via OAuth on brand's behalf |

```sql
UPDATE workspaces
SET drive_connection_type = $type,   -- 'agency' | 'brand'
    drive_oauth_token = $encrypted_token,
    drive_folder_id = $root_folder_id
WHERE id = $workspace_id
```

On first upload, folder structure is auto-created:
```
/{workspace.name}/{campaign.name}/{influencer.handle}/{platform}/
```

### Full flow summary

```
Brand navigates to /request-access
  └─→ Fills form (name, website, contact, description)
  └─→ brand_requests record created (status: pending)
  └─→ Sees confirmation screen

Agency opens /agency/requests
  └─→ Reviews pending request details

Agency clicks Reject
  └─→ status → rejected
  └─→ Agency manually notifies brand (v1)

Agency clicks Approve
  └─→ [AUTO] Workspace created from request data
  └─→ [AUTO] Agency user added as owner
  └─→ [AUTO] Default EMV rates seeded
  └─→ [AUTO] status → approved, workspace_id stored on request
  └─→ Agency redirected to /{slug}/overview
        └─→ Agency connects Google Drive (settings)
        └─→ Agency creates campaigns + adds influencers
```

### New database tables

```
brand_requests   -- Inbound connection requests from brands (status: pending | approved | rejected)
```

> **Removed tables (from previous design):**
> `brands` and `brand_invitations` are no longer needed. They were part of the agency-generated invite link flow which has been replaced by this request form + approval flow.
> If these tables exist in a migration, they should be dropped or left unused pending cleanup.

### Testing this flow in development

Use the dev-only manual workspace creation (`/onboarding`) for fast local testing. To test the full request → approval flow locally:

```sql
-- Seed a test brand request
INSERT INTO brand_requests (brand_name, website_url, contact_name, contact_email, status)
VALUES ('Test Brand', 'https://testbrand.com', 'Jane Cruz', 'jane@testbrand.com', 'pending');
```

Then open `http://localhost:3000/agency/requests` and approve it from the UI.

---

## 1. Post Detection (Polling — posts-worker)

**Endpoint:** `GET /api/cron/posts-worker`
**Handler:** `app/api/cron/posts-worker/route.ts`
**Trigger:** Vercel Cron, every 30 minutes (`*/30 * * * *`)
**Auth:** `Authorization: Bearer $CRON_SECRET`
**Supabase client:** `createServiceClient()` — writes posts across workspace boundaries

> **Why polling, not webhook?**
> EnsembleData does not push webhooks. Instead we poll their scraping APIs on a cron schedule — fetching recent posts per influencer and diffing against what we already have.

### Step-by-step

**Step 1 — Load all active campaign-influencer targets**

Query all `campaign_influencers` rows where `monitoring_status IN ('pending', 'active')` and the parent campaign has `status = 'active'`. Includes campaign tracking configs and cached platform IDs.

**Step 2 — Scrape each influencer per platform**

For each target, call EnsembleData for each platform the campaign tracks:
- **Instagram:** resolve `instagram_user_id` from handle (cached), then fetch `/instagram/user/posts` + `/ig/user/reels` in parallel
- **TikTok:** call `/tt/user/posts?username=<handle>&depth=<d>` — `depth=30` on first run (`pending`), `depth=1` on subsequent runs (`active`)
- **YouTube:** resolve `youtube_channel_id` from handle (cached if starts with `UC`), then fetch `/youtube/channel/videos`

**Step 3 — Filter posts**

For each scraped post, keep only posts that:
1. Fall within the campaign's `start_date`/`end_date` window
2. Match at least one hashtag or mention from the campaign's tracking config (caption match, case-insensitive)

**Step 4 — Upsert posts (idempotent)**

```sql
INSERT INTO posts (workspace_id, campaign_id, influencer_id, platform,
  post_url, platform_post_id, caption, thumbnail_url, posted_at,
  download_status, blocked_reason)
VALUES (...)
ON CONFLICT (platform_post_id, campaign_id) DO NOTHING
RETURNING id, download_status
```

- `usage_rights = false` → `download_status = 'blocked'`, `blocked_reason = 'no_usage_rights'`
- `usage_rights = true` → `download_status = 'pending'`

**Step 5 — Enqueue downloads**

For each newly inserted post with `download_status = 'pending'`, insert a `retry_queue` row with `job_type = 'download'`.

**Step 6 — Activate monitoring**

After a `pending` target completes its first scrape run, set `monitoring_status = 'active'` so future runs use shallow depth (faster).

**collab_status** is set by the `posts_collab_status_default` DB trigger — no application code needed.

---

## 2. Content Download Worker

**Endpoint:** `GET /api/cron/download-worker`
**Trigger:** Vercel Cron, every 5 minutes (`*/5 * * * *`)
**Auth:** Cron secret in `Authorization: Bearer` header
**Client:** `createServiceClient()`

### Step-by-step

**Step 1 — Claim jobs (atomic, prevents double-processing)**
```sql
UPDATE retry_queue
SET status = 'processing', attempts = attempts + 1
WHERE id IN (
  SELECT id FROM retry_queue
  WHERE status = 'pending'
    AND job_type = 'download'
    AND scheduled_at <= now()
  ORDER BY scheduled_at ASC
  LIMIT 10
  FOR UPDATE SKIP LOCKED
)
RETURNING *
```

**Step 2 — Load post context**
```sql
SELECT
  p.*,
  c.name AS campaign_name,
  i.full_name, i.ig_handle, i.tiktok_handle,
  w.name AS workspace_name,
  w.drive_connection_type, w.drive_oauth_token, w.drive_folder_id
FROM posts p
JOIN campaigns c ON c.id = p.campaign_id
JOIN influencers i ON i.id = p.influencer_id
JOIN workspaces w ON w.id = p.workspace_id
WHERE p.id = $post_id
```

**Step 3 — Fetch fresh media URL and download**
```typescript
// TikTok: GET /tt/post/info?aweme_id={ensemble_post_id}&token={TOKEN}
// Instagram: GET /ig/post/info?url={post_url}&token={TOKEN}
// YouTube: not downloadable — job fails gracefully

const mediaUrl = await fetchFreshMediaUrl(post.platform, post.ensemble_post_id, post.post_url)
if (!mediaUrl) throw new Error('Could not resolve media URL')
const fileBuffer = await fetch(mediaUrl).then(r => r.arrayBuffer())
```

**Step 4 — Build Drive folder path**
```typescript
const handle = post.influencer.ig_handle || post.influencer.tiktok_handle || post.influencer.full_name
const folderPath = `${post.workspace_name}/${post.campaign_name}/${handle}/${post.platform}`
```

**Step 5 — Upload to Google Drive**

Drive client is initialized using the workspace's `drive_connection_type` and `drive_oauth_token`:
```typescript
// lib/drive/upload.ts
const driveClient = getDriveClient(workspace.drive_connection_type, workspace.drive_oauth_token)
const { fileId, folderPath } = await uploadToDrive(driveClient, {
  fileBuffer,
  fileName: `post-${post.id}.${ext}`,
  folderPath,
})
```

**Step 6 — Update records on success**
```sql
UPDATE posts
SET download_status = 'downloaded',
    drive_file_id = $file_id,
    drive_folder_path = $folder_path,
    downloaded_at = now()
WHERE id = $post_id;

UPDATE retry_queue SET status = 'done', processed_at = now() WHERE id = $job_id;
```

**Step 7 — Handle failure**
```sql
-- If attempts >= 3: mark permanently failed
UPDATE posts SET download_status = 'failed' WHERE id = $post_id;
UPDATE retry_queue SET status = 'failed', error = $message, processed_at = now() WHERE id = $job_id;

-- If attempts < 3: reschedule with backoff
UPDATE retry_queue
SET status = 'pending',
    error = $message,
    scheduled_at = now() + (attempts * INTERVAL '15 minutes')
WHERE id = $job_id;
```

---

## 3. Metrics Fetch Worker

**Endpoint:** `GET /api/cron/metrics-worker`
**Trigger:** Vercel Cron, every 10 minutes (`*/10 * * * *`)
**Upstream enqueue:** pg_cron job `enqueue-metrics-fetch` (hourly)

### Phase A — pg_cron enqueue (runs hourly in Supabase)
```sql
INSERT INTO retry_queue (post_id, job_type, status)
SELECT p.id, 'metrics_fetch', 'pending'
FROM posts p
WHERE p.metrics_fetched_at IS NULL
  AND p.metrics_fetch_after <= now()
  AND NOT EXISTS (
    SELECT 1 FROM retry_queue rq
    WHERE rq.post_id = p.id
      AND rq.job_type = 'metrics_fetch'
      AND rq.status IN ('pending', 'processing')
  )
```

### Phase B — Worker processes jobs

**Step 1 — Claim jobs** (same `FOR UPDATE SKIP LOCKED` pattern, `job_type = 'metrics_fetch'`)

**Step 2 — Fetch metrics**
```typescript
// TikTok: GET /tt/post/info?aweme_id={ensemble_post_id}&token={TOKEN}
// Instagram: GET /ig/post/info?url={post_url}&token={TOKEN}
// YouTube: GET /yt/video/details?videoId={ensemble_post_id}&token={TOKEN}
```
Normalized to: `{ views, likes, comments, shares, saves, follower_count, engagement_rate }`

**Step 3 — Fetch CPM config**
```sql
SELECT cpm_rate FROM emv_config
WHERE workspace_id = $workspace_id AND platform = $platform
```

**Step 4 — Calculate EMV**
```typescript
const emv = metrics.views * (cpm_rate / 1000)
```

**Step 5 — Write post_metrics (immutable)**
```sql
INSERT INTO post_metrics (
  post_id, workspace_id, views, likes, comments, shares, saves,
  follower_count, engagement_rate, emv, emv_cpm_used, fetched_at
)
VALUES (...)
-- NO ON CONFLICT — second write = a bug, fails intentionally
```

**Step 6 — Mark post as fetched**
```sql
UPDATE posts SET metrics_fetched_at = now() WHERE id = $post_id;
UPDATE retry_queue SET status = 'done', processed_at = now() WHERE id = $job_id;
```

---

## 4. Campaign Lifecycle

```
DRAFT ──[Activate]──► ACTIVE ──[end_date passes or manual]──► ENDED
```

### Draft → Active
- **Triggered by:** User clicking "Activate" on campaign detail page
- **Server Action:** `updateCampaign(workspaceId, campaignId, { status: 'active' })`

### Active → Ended (automatic via pg_cron)
- **Trigger:** `end-expired-campaigns` runs daily at 00:00 UTC
- `UPDATE campaigns SET status = 'ended' WHERE status = 'active' AND end_date < current_date`

### Active → Ended (manual)
- **Triggered by:** User clicking "End campaign" in campaign settings
- **Server Action:** `updateCampaign(workspaceId, campaignId, { status: 'ended' })`

### Notes
- Ended campaigns are read-only — all posts and analytics still visible
- `draft` campaigns do not receive any webhook posts
- No "reactivate" feature in v1

---

## 5. Workspace Creation Flow ⚠️ DEV ONLY

> In production, workspaces are auto-created via **Flow 0 (Brand Connection Request)**. This flow is for local development only.

1. User signs up → Supabase email confirmation → `/auth/callback` → redirect to `/app`
2. `/app/page.tsx`: no workspace membership → redirect to `/onboarding` *(dev only)*
3. User submits workspace name → `createWorkspace` Server Action:
   - Generate slug from name
   - `INSERT INTO workspaces`
   - `INSERT INTO workspace_members` (user as `owner`)
   - `CALL seed_workspace_defaults(workspace.id)`
4. Redirect to `/{slug}/overview`

---

## 6. Invitation Flow (Agency Staff)

1. Admin opens `/{slug}/settings` → Members tab
2. Enters email + role → `inviteMember` Server Action:
   - `INSERT INTO invitations` with 32-byte hex token, expires 7 days
   - **TODO:** Send email via Resend/Postmark (v2)
3. Invitee clicks link → `GET /invite/{token}`
4. Token validated: exists, not expired, `accepted_at IS NULL`
5. Auth gate (same pattern as Flow 0 Step 3 auth gate)
6. On accept: `acceptInvitation(token)` → `INSERT INTO workspace_members` → redirect to workspace

---

## 7. Usage Rights Toggle Flow

**Pattern:** Optimistic update with server confirmation

1. User clicks toggle
2. `useOptimistic` updates local state immediately
3. `startTransition` calls `toggleUsageRights(campaignInfluencerId, newValue)`
4. `UPDATE campaign_influencers SET usage_rights = $newValue, usage_rights_updated_at = now()`
5. On success: `revalidatePath`
6. On failure: optimistic state reverts, error toast shown

**Important:** Toggling ON does NOT retroactively download previously blocked posts (see DECISIONS.md D-004).

---

## 8. Manual Retry Download Flow (v2 — not in v1)

When `download_status = 'blocked'` or `'failed'` and user wants to retry:

1. User clicks "Retry download" on post row
2. `retryDownload(postId)` Server Action:
   - Check `usage_rights = true` (for blocked posts)
   - `UPDATE posts SET download_status = 'pending'`
   - `INSERT INTO retry_queue (post_id, job_type='download', status='pending')`
3. Worker picks it up on next cron run (≤ 5 minutes)

Out of scope for v1. UI shows retry button as disabled with "Coming soon" tooltip.
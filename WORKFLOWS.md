# Workflows — Instroom

> **Detailed step-by-step flows for all data pipelines.**
> Read before touching: the brand request handler, workspace creation, download worker, metrics worker, or campaign lifecycle code.

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

Brand navigates to `https://app.instroom.co/request-access` and fills in the public form.

Form fields:
- Brand name (required)
- Website URL (required)
- Contact name (required)
- Contact email (required)
- Brief description of campaign needs (optional)

On submit, the system creates a `brand_requests` record:

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

Agency staff log in and navigate to `/agency/requests`. The page lists all `brand_requests` with `status = 'pending'`, showing brand name, website, contact, and description.

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

`approveBrandRequest(requestId)` Server Action (uses **service client**):

```sql
BEGIN TRANSACTION;

-- 1. Re-validate request is still pending
SELECT * FROM brand_requests WHERE id = $request_id AND status = 'pending';

-- 2. Generate slug from brand name
-- toSlug(brand_name) — append random suffix if slug already taken

-- 3. Auto-create workspace from request data
INSERT INTO workspaces (name, slug)
VALUES ($brand_name, $slug)
RETURNING id;

-- 4. Add approving agency user as workspace owner
INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES ($workspace_id, $agency_user_id, 'owner');

-- 5. Seed default EMV CPM rates
CALL seed_workspace_defaults($workspace_id);

-- 6. Mark request as approved
UPDATE brand_requests
SET status = 'approved', workspace_id = $workspace_id,
    reviewed_at = now(), reviewed_by = $agency_user_id
WHERE id = $request_id;

COMMIT;
```

Agency is redirected to the new workspace: `/{workspace_slug}/overview`.

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

## 1. Post Detection (Ensemble Webhook)

**Endpoint:** `POST /api/webhooks/ensemble`
**Handler:** `app/api/webhooks/ensemble/route.ts`
**Auth:** HMAC-SHA256 signature on every request (`ENSEMBLE_WEBHOOK_SECRET`)
**Supabase client:** `createServiceClient()` — writes posts across workspace boundaries

> **Why webhook, not polling?**
> Ensemble sends a push notification the moment an influencer publishes a matching post. The webhook handler must respond in < 3 seconds — Drive uploads are offloaded to the retry queue.

### Step-by-step

**Step 1 — Verify HMAC-SHA256 signature**
```typescript
const isValid = verifyEnsembleSignature(rawBody, signature, ENSEMBLE_WEBHOOK_SECRET)
if (!isValid) return Response.json({ error: 'Unauthorized' }, { status: 401 })
```

**Step 2 — Find matching active campaigns**
```sql
SELECT c.id, c.workspace_id,
  campaign_tracking_configs(platform, hashtags, mentions),
  campaign_influencers(id, usage_rights,
    influencer:influencers(id, ig_handle, tiktok_handle, tiktok_sec_uid, youtube_handle)
  )
FROM campaigns c
WHERE status = 'active'
  AND start_date <= $posted_at::date
  AND end_date >= $posted_at::date
  AND $platform = ANY(platforms)
```
Match if payload hashtags/mentions overlap with campaign tracking config. If no match → return 200 (silent discard).

**Step 3 — For each matching campaign:**

**Step 3a — Upsert post (idempotent)**
```sql
INSERT INTO posts (
  workspace_id, campaign_id, influencer_id, platform, post_url,
  ensemble_post_id, caption, thumbnail_url, posted_at,
  metrics_fetch_after, download_status
)
VALUES (...)
ON CONFLICT (ensemble_post_id, campaign_id) DO NOTHING
RETURNING id
```
If `DO NOTHING` fired (duplicate) → skip.

**Step 3b — Usage rights check**
```sql
SELECT usage_rights FROM campaign_influencers
WHERE campaign_id = $campaign_id AND influencer_id = $influencer_id
```

- `usage_rights = false`:
  ```sql
  UPDATE posts SET download_status = 'blocked', blocked_reason = 'no_usage_rights'
  ```

- `usage_rights = true`:
  ```sql
  INSERT INTO retry_queue (post_id, job_type, status) VALUES ($post_id, 'download', 'pending')
  ```

**Step 3c — collab_status**
Handled by the `posts_collab_status_default` DB trigger — no application code needed.

**Step 4 — Return 200 always**
Always return 200 — prevents Ensemble from retrying on valid discards.

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
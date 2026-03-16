# Workflows — Instroom

> **Detailed step-by-step flows for all data pipelines.**
> Read before touching: the Ensemble webhook handler, download worker, metrics worker, or campaign lifecycle code.

---

## 0. Brand Onboarding & Workspace Auto-Creation

**Triggered by:** Agency generating a brand invite link from the agency dashboard
**Auth:** Token-based (32-byte hex, expires in 30 days)
**Supabase client:** `createServiceClient()` — workspace creation crosses user boundaries

> **Architecture context**
> Instroom is built for marketing agencies. The agency is the super admin and manages multiple brand workspaces. Each brand gets its own isolated workspace. Workspaces are **never manually created by the brand** — they are auto-created when the brand admin accepts an agency-generated onboarding link.
>
> Flow 5 (manual workspace creation) exists **for local development only** and must not be accessible in production.

### Actors
- **Marketing Agency** — initiates onboarding from the agency dashboard
- **Brand Admin** — receives the link, accepts it, lands on their auto-created workspace

### Step-by-step

**Step 1 — Agency creates a brand entry**

From the agency dashboard, the agency fills in the brand name. The system generates a slug and creates a `brands` record in `pending` status.

```sql
INSERT INTO brands (agency_id, name, slug, status)
VALUES ($agency_id, $name, toSlug($name), 'pending')
RETURNING id, slug
```

**Step 2 — System generates a unique onboarding token**

A 32-byte hex token is created and tied to the brand record, expiring in 30 days.

```sql
INSERT INTO brand_invitations (brand_id, token, expires_at)
VALUES ($brand_id, randomHex(32), now() + INTERVAL '30 days')
```

The onboarding link format:
```
https://app.instroom.co/onboard/{token}
```

> **TODO (v2):** Auto-send this link via Resend/Postmark when the agency creates the brand. In v1, the agency copies and sends the link manually.

**Step 3 — Agency sends the link to the brand client**

The agency copies the generated link and delivers it to the brand admin (email, Slack, etc.).

**Step 4 — Brand admin clicks the link**

The system validates the token before rendering the acceptance page.

```
GET /onboard/{token}

Validations:
  - Token exists in brand_invitations
  - expires_at > now()
  - accepted_at IS NULL (not already used)
  - brands.status = 'pending'
```

**Step 5 — Authentication gate**

| State | Behavior |
|---|---|
| Not logged in | Show "Sign in" / "Create account" buttons. After auth, redirect back to `/onboard/{token}`. |
| Logged in, wrong email | Show: "This invitation was sent to {email}. Please sign in with that account." |
| Logged in, email matches | Show workspace name + brand details + "Accept & Enter Workspace" button. |

**Step 6 — Auto-create workspace on accept**

`acceptBrandInvitation(token)` Server Action (uses **service client**):

```sql
BEGIN TRANSACTION;

-- 1. Re-validate token
SELECT * FROM brand_invitations
WHERE token = $token AND expires_at > now() AND accepted_at IS NULL;

-- 2. Auto-create workspace from brand record (no user input needed)
INSERT INTO workspaces (agency_id, brand_id, name, slug)
VALUES ($agency_id, $brand_id, $brand_name, $brand_slug)
RETURNING id;

-- 3. Add brand admin as workspace owner
INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES ($workspace_id, $user_id, 'owner');

-- 4. Seed default EMV CPM rates
CALL seed_workspace_defaults($workspace_id);

-- 5. Mark brand as active
UPDATE brands SET status = 'active' WHERE id = $brand_id;

-- 6. Consume the token
UPDATE brand_invitations SET accepted_at = now() WHERE token = $token;

COMMIT;
```

Redirect to `/{brand_slug}/overview`.

**Step 7 — Brand admin invites their team members**

From their workspace, the brand admin uses the standard Invitation Flow (Flow 6) to add team members. This is unchanged.

### Full flow summary

```
Agency Dashboard
  └─→ Creates brand entry (status: pending)
  └─→ Generates onboarding token (expires: 30 days)
  └─→ Sends link → https://app.instroom.co/onboard/{token}

Brand Admin clicks link
  └─→ Token validated
  └─→ Auth gate (login / create account if needed)
  └─→ Shows: brand name + "Accept & Enter Workspace"

Brand Admin accepts
  └─→ [AUTO] Workspace created from brand record
  └─→ [AUTO] Brand admin added as owner
  └─→ [AUTO] Default EMV rates seeded
  └─→ Brand status → active
  └─→ Token marked as used (single-use)
  └─→ Redirect to /{brand_slug}/overview
        └─→ Brand admin invites team members via Flow 6
```

### New database tables

```
brands              -- Brand records managed by the agency (status: pending | active)
brand_invitations   -- Onboarding tokens (single-use, expires in 30 days)
```

Existing tables used: `workspaces`, `workspace_members`.

### Testing this flow in development

The onboarding link is agency-generated and brand-specific, so there is no public entry point to test in local dev. Use **token seeding** instead — this exercises the exact same production code path with no special handling required:

```sql
-- 1. Insert a test brand
INSERT INTO brands (agency_id, name, slug, status)
VALUES ('your-dev-agency-id', 'Test Brand', 'test-brand', 'pending')
RETURNING id;

-- 2. Seed a known token against that brand
INSERT INTO brand_invitations (brand_id, token, expires_at)
VALUES ('brand-id-from-above', 'dev-test-token-123', now() + INTERVAL '999 days');
```

Then open:
```
http://localhost:3000/onboard/dev-test-token-123
```

The full acceptance flow runs exactly as it would in production.

---

---

## 1. Post Detection (EnsembleData Polling)

**Endpoint:** `GET /api/cron/posts-worker`
**Handler:** `app/api/cron/posts-worker/route.ts`
**Trigger:** Vercel Cron, every 30 minutes (`*/30 * * * *`)
**Auth:** Cron secret in `Authorization: Bearer` header
**Supabase client:** `createServiceClient()` — posts are written across workspace boundaries

> **Why polling, not webhooks?**
> EnsembleData (`ensembledata.com`) is a pull-based scraping API. It has no webhook/push capability. The app polls it on a schedule for each active campaign's influencers.

### EnsembleData API
- **Base URL:** `https://ensembledata.com/apis`
- **Auth:** `?token={ENSEMBLE_API_KEY}` query parameter on every request
- **No internal influencer IDs** — platform-native IDs are used:
  - TikTok: `aweme_id` (post), `sec_uid` (stable user identifier)
  - Instagram: shortcode extracted from post URL (e.g. `/p/ABC123/`)
  - YouTube: video ID extracted from URL (e.g. `?v=XYZ`)

### Step-by-step

**Step 1 — Load active campaigns**
```sql
SELECT c.id, c.workspace_id,
  campaign_tracking_configs(platform, hashtags, mentions),
  campaign_influencers(id, usage_rights,
    influencer:influencers(id, ig_handle, tiktok_handle, tiktok_sec_uid, youtube_handle, youtube_channel_id)
  )
FROM campaigns c
WHERE status = 'active'
```

**Step 2 — For each campaign → influencer → platform:**

**Instagram** (`ig_handle` present, campaign tracks instagram):
```
GET /ig/user/posts?username={ig_handle}&token={TOKEN}
→ scan caption for matching hashtags/mentions
→ platform_post_id = shortcode extracted from post URL
→ media_url = video_url ?? display_url
```

**TikTok** (`tiktok_handle` present, campaign tracks tiktok):
```
GET /tt/user/posts/username?username={tiktok_handle}&token={TOKEN}
  — or, if tiktok_sec_uid is stored (preferred, stable):
GET /tt/user/posts/secuid?secUid={sec_uid}&token={TOKEN}
→ scan desc for matching hashtags/mentions
→ platform_post_id = aweme_id
→ media_url = video.download_addr  ← watermark-free URL
→ auto-save sec_uid from response to influencers.tiktok_sec_uid
```

**YouTube** (`youtube_handle` present, campaign tracks youtube):
```
If youtube_channel_id not stored:
  GET /yt/channel/username-to-id?name={youtube_handle}&token={TOKEN}
  → save result to influencers.youtube_channel_id
GET /yt/channel/videos?channelId={youtube_channel_id}&token={TOKEN}
→ scan title + description for matching hashtags/mentions
→ platform_post_id = video ID from URL
→ media_url = null (YouTube not directly downloadable)
```

**Step 3 — For each matched new post:**

**Step 3a — Upsert post (idempotent)**
```sql
INSERT INTO posts (
  workspace_id, campaign_id, influencer_id, platform, post_url,
  platform_post_id, media_url, caption, thumbnail_url, posted_at,
  download_status
)
VALUES (...)
ON CONFLICT (platform_post_id, campaign_id) DO NOTHING
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

---

## 2. Content Download Worker

**Endpoint:** `GET /api/cron/download-worker`  
**Trigger:** Vercel Cron, every 5 minutes (`*/5 * * * *`)  
**Auth:** Cron secret in `Authorization: Bearer` header  
**Client:** `createServiceClient()` — needs to write posts across workspaces  

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

**Step 2 — For each claimed job, load post context**
```sql
SELECT
  p.*,
  c.name AS campaign_name,
  i.full_name, i.ig_handle, i.tiktok_handle,
  w.name AS workspace_name
FROM posts p
JOIN campaigns c ON c.id = p.campaign_id
JOIN influencers i ON i.id = p.influencer_id
JOIN workspaces w ON w.id = p.workspace_id
WHERE p.id = $post_id
```

**Step 3 — Fetch fresh media URL and download**

CDN links stored during scraping can expire, so the worker re-queries EnsembleData for a fresh URL before downloading:
```typescript
// TikTok: GET /tt/post/info?aweme_id={platform_post_id}&token={TOKEN}
// Instagram: GET /ig/post/info?url={post_url}&token={TOKEN}
// YouTube: not downloadable — job fails gracefully

const mediaUrl = await fetchFreshMediaUrl(post.platform, post.platform_post_id, post.post_url)
if (!mediaUrl) throw new Error('Could not resolve media URL')
const fileBuffer = await fetch(mediaUrl).then(r => r.arrayBuffer())
```

**Step 4 — Build Drive folder path**
```typescript
const handle = post.influencer.ig_handle || post.influencer.tiktok_handle || post.influencer.full_name
const folderPath = `${post.workspace_name}/${post.campaign_name}/${handle}/${post.platform}`
```

**Step 5 — Upload to Google Drive**
```typescript
// lib/drive/upload.ts
const { fileId, folderPath } = await uploadToDrive({
  fileBuffer,
  fileName: `post-${post.id}.${ext}`,
  folderPath,
})
```

Drive folder creation is cached in memory to avoid duplicate `files.list` + `files.create` calls within the same worker run.

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
**Upstream enqueue:** pg_cron job `enqueue-metrics-fetch` (hourly) inserts eligible posts into `retry_queue`  

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

**Step 1 — Claim jobs** (same `FOR UPDATE SKIP LOCKED` pattern as download worker, `job_type = 'metrics_fetch'`)

**Step 2 — Fetch metrics via platform-specific EnsembleData endpoints**
```typescript
// TikTok:
GET /tt/post/info?aweme_id={platform_post_id}&token={TOKEN}
// → statistics.play_count (views), digg_count (likes), comment_count, share_count

// Instagram:
GET /ig/post/info?url={post_url}&token={TOKEN}
// → like_count, comment_count, view_count, save_count

// YouTube:
GET /yt/video/details?videoId={platform_post_id}&token={TOKEN}
// → view_count, like_count, comment_count
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
-- NO ON CONFLICT clause — if post_id already exists, this errors out intentionally.
-- Metrics are written exactly once. A second write = a bug.
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
- **Triggered by:** User clicking "Activate" button on campaign detail page
- **Server Action:** `updateCampaign(workspaceId, campaignId, { status: 'active' })`
- **Effect:** Ensemble starts sending webhooks that match this campaign's hashtags/mentions

### Active → Ended (automatic via pg_cron)
- **Trigger:** pg_cron job `end-expired-campaigns` runs daily at 00:00 UTC
- **Query:** `UPDATE campaigns SET status = 'ended' WHERE status = 'active' AND end_date < current_date`
- **Effect:** Webhook posts from this date forward will not match this campaign (date window filter)

### Active → Ended (manual)
- **Triggered by:** User clicking "End campaign" in campaign settings
- **Server Action:** `updateCampaign(workspaceId, campaignId, { status: 'ended' })`

### Side effects of ending (pg_cron)
```sql
-- Runs 5 minutes after the end-campaigns job
UPDATE campaign_influencers
SET monitoring_status = 'paused'
WHERE campaign_id IN (SELECT id FROM campaigns WHERE status = 'ended')
  AND monitoring_status != 'paused'
```

### Notes
- A campaign in `ended` status still shows all its posts and analytics — it's read-only
- `draft` campaigns do not receive any webhook posts (step 2 of detection only matches `status = 'active'`)
- There is no "reactivate" feature in v1 (out of scope)

---

## 5. Workspace Creation Flow ⚠️ DEV ONLY

> **This flow is for local development and testing only.**
> In production, workspaces are auto-created via **Flow 0 (Brand Onboarding)**. The `/onboarding` route and `OnboardingForm` must be disabled or hidden behind an environment check (`NODE_ENV === 'development'`) before going to production.
>
> **Why it still exists:** Lets developers create a workspace instantly during local dev without needing to run the full agency → brand → invite link flow.

1. User signs up → Supabase email confirmation → `/auth/callback` → cookie set → redirect to `/app`
2. `/app/page.tsx` checks: does this user have any workspace membership?
   - **Yes** → redirect to `/{lastSlug}/overview`
   - **No** → redirect to `/onboarding` *(dev only — in production this state should not occur; brand admin always arrives via Flow 0)*
3. `/onboarding` renders `OnboardingForm`
4. User submits workspace name → `createWorkspace` Server Action (uses **service client**):
   - Generate slug from name (`toSlug(name)`) — append random suffix if slug is taken
   - `INSERT INTO workspaces`
   - `INSERT INTO workspace_members` (user as `owner`)
   - `CALL seed_workspace_defaults(workspace.id)` — inserts default EMV CPM rates
5. Redirect to `/{slug}/overview`

---

## 6. Invitation Flow

1. Admin opens `/{slug}/settings` → Members tab
2. Enters email + role → submits → `inviteMember` Server Action:
   - Validate: email not already a member
   - `INSERT INTO invitations` with random 32-byte hex `token`, expires in 7 days
   - **TODO:** Send invitation email via Resend/Postmark with link: `https://app.instroom.co/invite/{token}`
3. Invitee receives email, clicks link → `GET /invite/{token}`
4. Page validates token: exists, not expired, `accepted_at IS NULL`
5. **Invitee not logged in:**
   - Show "Sign in to accept" / "Create account" buttons
   - Store redirect: `/invite/{token}?from=invite` in query params
6. **Invitee logged in, wrong email:**
   - Show: "This invitation was sent to {invitation.email}. Please sign in with that account."
7. **Invitee logged in, email matches:**
   - Show workspace name + role, "Accept Invitation" button
   - `acceptInvitation(token)` Server Action (uses **service client**):
     - Re-validate token
     - `INSERT INTO workspace_members` (invitee + role from invitation)
     - `UPDATE invitations SET accepted_at = now()`
     - Redirect to `/{workspace_slug}/overview`

---

## 7. Usage Rights Toggle Flow

**Component:** `CampaignInfluencersList` (and `UsageRightsPanel` on overview)  
**Pattern:** Optimistic update with server confirmation

1. User clicks toggle
2. `useOptimistic` updates local state immediately (toggle flips visually)
3. `startTransition` calls `toggleUsageRights(campaignInfluencerId, newValue)` Server Action
4. Server Action: `UPDATE campaign_influencers SET usage_rights = $newValue, usage_rights_updated_at = now()`
5. On success: `revalidatePath` refreshes the server data
6. On failure: optimistic state reverts automatically, error toast shown

**Important:** Toggling ON does NOT retroactively download previously blocked posts. See DECISIONS.md D-004.

---

## 8. Manual Retry Download Flow (v2 — not in v1)

When a post has `download_status = 'blocked'` or `'failed'`, and the user wants to retry:

1. User clicks "Retry download" on post row
2. `retryDownload(postId)` Server Action:
   - Check usage_rights is now `true` (for blocked posts)
   - `UPDATE posts SET download_status = 'pending'`
   - `INSERT INTO retry_queue (post_id, job_type='download', status='pending')`
3. Worker picks it up on next cron run (≤ 5 minutes)

This is **out of scope for v1**. The UI may show the retry button as disabled with a tooltip explaining it's coming soon.

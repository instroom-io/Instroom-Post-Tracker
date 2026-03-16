# Database — Instroom

> Migration file: `supabase/migrations/0001_initial_schema.sql`
>
> **Apply migrations:** `npm run db:push`  
> **Regenerate TypeScript types:** `npm run db:generate`  
> **Local Studio:** `npx supabase studio`  
> **Reset local DB:** `npx supabase db reset`

---

## 1. Tables Overview

| Table | Purpose |
|-------|---------|
| `users` | Public user profiles (mirrors `auth.users`) |
| `brands` | Brand records managed by the agency (status: pending → active) |
| `brand_invitations` | Agency-generated onboarding tokens — auto-create workspace on accept |
| `workspaces` | One per brand client — billing + isolation unit |
| `workspace_members` | User ↔ workspace with role |
| `workspace_platform_handles` | Brand's own social accounts (for exclusion logic) |
| `invitations` | Pending email invitations for team members (token-based) |
| `campaigns` | Campaign definition with date window |
| `campaign_tracking_configs` | Hashtags + mentions to watch, per platform per campaign |
| `influencers` | Influencer roster scoped to a workspace |
| `campaign_influencers` | Which influencers are in each campaign + usage rights |
| `posts` | Detected posts (1 row per post × campaign match) |
| `post_metrics` | Frozen 7-day analytics snapshot per post |
| `emv_config` | CPM rates per platform per workspace |
| `retry_queue` | Async job queue for downloads + metrics fetches |

---

## 2. Full Schema

### `users`
```sql
id            uuid primary key references auth.users on delete cascade
email         text not null unique
full_name     text
avatar_url    text
created_at    timestamptz default now()
```

### `brands`
```sql
id            uuid primary key default gen_random_uuid()
agency_id     uuid not null references users on delete cascade   -- the agency owner
name          text not null
slug          text not null unique
status        brand_status not null default 'pending'            -- enum: pending|active
created_at    timestamptz default now()
```

> `agency_id` refers to the agency's user record. In v1 there is one agency per Instroom instance.
> `status` transitions: `pending` (link generated, not yet accepted) → `active` (brand admin accepted).

### `brand_invitations`
```sql
id            uuid primary key default gen_random_uuid()
brand_id      uuid not null references brands on delete cascade
token         text not null unique                               -- 32-byte hex, single-use
expires_at    timestamptz not null                              -- now() + 30 days
accepted_at   timestamptz                                       -- null until accepted
created_at    timestamptz default now()
```

> Token is consumed on acceptance (`accepted_at` set). A second acceptance attempt will be rejected.
> Link format: `https://app.instroom.co/onboard/{token}`

### `workspaces`
```sql
id              uuid primary key default gen_random_uuid()
name            text not null
slug            text not null unique
logo_url        text
drive_folder_id text
created_at      timestamptz default now()
```

### `workspace_members`
```sql
id            uuid primary key default gen_random_uuid()
workspace_id  uuid not null references workspaces on delete cascade
user_id       uuid not null references users on delete cascade
role          workspace_role not null  -- enum: owner|admin|editor|viewer
invited_by    uuid references users
joined_at     timestamptz default now()
unique (workspace_id, user_id)
```

### `workspace_platform_handles`
```sql
id            uuid primary key default gen_random_uuid()
workspace_id  uuid not null references workspaces on delete cascade
platform      platform_type not null
handle        text not null
display_name  text
unique (workspace_id, platform, handle)
```

### `invitations`
```sql
id            uuid primary key default gen_random_uuid()
workspace_id  uuid not null references workspaces on delete cascade
email         text not null
role          workspace_role not null
token         text not null unique
expires_at    timestamptz not null  -- typically now() + 7 days
accepted_at   timestamptz
created_at    timestamptz default now()
```

### `campaigns`
```sql
id              uuid primary key default gen_random_uuid()
workspace_id    uuid not null references workspaces on delete cascade
name            text not null
platforms       platform_type[] not null default '{}'
start_date      date not null
end_date        date not null
status          campaign_status not null default 'draft'
drive_folder_id text
created_by      uuid references users
created_at      timestamptz default now()
constraint campaigns_dates_check check (end_date >= start_date)
```

### `campaign_tracking_configs`
```sql
id          uuid primary key default gen_random_uuid()
campaign_id uuid not null references campaigns on delete cascade
platform    platform_type not null
hashtags    text[] not null default '{}'
mentions    text[] not null default '{}'
unique (campaign_id, platform)
```

### `influencers`
```sql
id               uuid primary key default gen_random_uuid()
workspace_id     uuid not null references workspaces on delete cascade
full_name        text not null
ensemble_id      text
ig_handle        text
tiktok_handle    text
youtube_handle   text
profile_pic_url  text
created_at       timestamptz default now()
```

### `campaign_influencers`
```sql
id                        uuid primary key default gen_random_uuid()
campaign_id               uuid not null references campaigns on delete cascade
influencer_id             uuid not null references influencers on delete cascade
usage_rights              boolean not null default false
usage_rights_updated_at   timestamptz
ensemble_tracking_id      text
monitoring_status         monitoring_status not null default 'pending'
added_by                  uuid references users
added_at                  timestamptz default now()
unique (campaign_id, influencer_id)
```

### `posts`
```sql
id                  uuid primary key default gen_random_uuid()
workspace_id        uuid not null references workspaces on delete cascade
campaign_id         uuid not null references campaigns on delete cascade
influencer_id       uuid not null references influencers
platform            platform_type not null
post_url            text not null
ensemble_post_id    text not null
caption             text
thumbnail_url       text
posted_at           timestamptz not null
detected_at         timestamptz not null default now()
download_status     download_status not null default 'pending'
blocked_reason      text check (blocked_reason in ('no_usage_rights') or blocked_reason is null)
drive_file_id       text
drive_folder_path   text
downloaded_at       timestamptz
collab_status       collab_status not null default 'n/a'
collab_checked_by   uuid references users
metrics_fetch_after timestamptz not null  -- = posted_at + 7 days (set by app on insert)
metrics_fetched_at  timestamptz
unique (ensemble_post_id, campaign_id)
```

### `post_metrics`
```sql
id               uuid primary key default gen_random_uuid()
post_id          uuid not null references posts on delete cascade unique  -- 1:1
workspace_id     uuid not null references workspaces on delete cascade
views            bigint not null default 0
likes            bigint not null default 0
comments         bigint not null default 0
shares           bigint not null default 0
saves            bigint    -- Instagram only, null for others
follower_count   bigint not null default 0
engagement_rate  numeric(6,4) not null default 0  -- 0.0000 to 1.0000
emv              numeric(12,2) not null default 0  -- USD
emv_cpm_used     numeric(8,2) not null             -- CPM at time of calculation
fetched_at       timestamptz not null default now()
```

### `emv_config`
```sql
id            uuid primary key default gen_random_uuid()
workspace_id  uuid not null references workspaces on delete cascade
platform      platform_type not null
cpm_rate      numeric(8,2) not null
updated_at    timestamptz default now()
unique (workspace_id, platform)
```

Default seeded values (via `seed_workspace_defaults` RPC):
- Instagram: $5.20 CPM
- TikTok: $3.80 CPM
- YouTube: $7.50 CPM

### `retry_queue`
```sql
id            uuid primary key default gen_random_uuid()
post_id       uuid not null references posts on delete cascade
job_type      job_type not null      -- enum: download|metrics_fetch
status        job_status not null default 'pending'  -- enum: pending|processing|done|failed
attempts      int not null default 0
scheduled_at  timestamptz not null default now()
processed_at  timestamptz
error         text
```

---

## 3. Enums

```sql
create type brand_status      as enum ('pending', 'active');
create type platform_type     as enum ('instagram', 'tiktok', 'youtube');
create type workspace_role    as enum ('owner', 'admin', 'editor', 'viewer');
create type campaign_status   as enum ('draft', 'active', 'ended');
create type monitoring_status as enum ('pending', 'active', 'paused');
create type download_status   as enum ('pending', 'downloaded', 'blocked', 'failed');
create type collab_status     as enum ('n/a', 'pending', 'confirmed', 'not_added');
create type job_type          as enum ('download', 'metrics_fetch');
create type job_status        as enum ('pending', 'processing', 'done', 'failed');
```

---

## 4. Key Constraints

### Post deduplication
```sql
unique (ensemble_post_id, campaign_id)
```
The same Ensemble post can match multiple campaigns. `ON CONFLICT DO NOTHING` in webhook handler makes inserts idempotent. **`ensemble_post_id` alone is NOT unique in this table.**

### Tracking config uniqueness
```sql
unique (campaign_id, platform)
```
Use `upsert` with `onConflict: 'campaign_id,platform'` when saving.

### Campaign date validation
```sql
constraint campaigns_dates_check check (end_date >= start_date)
```

### Post metrics — 1:1 with post
```sql
unique (post_id) on post_metrics
```
Metrics are written once, never updated. A second INSERT will error — intentionally.

---

## 5. Triggers

### `handle_new_user` — on `auth.users` INSERT
Automatically creates a `public.users` profile row when someone signs up. `ON CONFLICT DO NOTHING` makes it idempotent.

### `campaign_status_on_update` — on `campaigns` UPDATE
Auto-sets `status = 'ended'` when `end_date < current_date AND status = 'active'`. Catches manual date edits that would leave a campaign in an inconsistent state.

### `posts_collab_status_default` — on `posts` INSERT
Sets `collab_status = 'n/a'` for `platform != 'instagram'`, `'pending'` for Instagram. Enforces the business rule at the DB level — no application code needed.

---

## 6. RLS Policies

### The workspace membership helper

```sql
create function public.my_workspace_ids()
returns setof uuid language sql security definer stable as $$
  select workspace_id from workspace_members where user_id = auth.uid()
$$;
```

This function is used in every RLS policy. It returns all workspace IDs the current user belongs to.

### Policy pattern (example: campaigns)

```sql
-- SELECT: any member of the workspace
create policy "Members can view campaigns"
  on campaigns for select
  using (workspace_id in (select public.my_workspace_ids()));

-- INSERT: editor or above
create policy "Editors can create campaigns"
  on campaigns for insert
  with check (
    workspace_id in (select public.my_workspace_ids())
    and exists (
      select 1 from workspace_members
      where workspace_id = campaigns.workspace_id
        and user_id = auth.uid()
        and role in ('owner', 'admin', 'editor')
    )
  );
```

### Write permissions by role

| Action | Minimum role |
|--------|-------------|
| View all data | `viewer` |
| Create/edit campaigns | `editor` |
| Toggle usage rights (`campaign_influencers.usage_rights`) | `editor` |
| Update collab status (`posts.collab_status`) | `editor` |
| Add/remove campaign influencers | `editor` |
| Invite/remove workspace members | `admin` |
| Delete campaigns | `admin` |
| Update workspace settings | `admin` |
| Change EMV config | `admin` |

### Tables written only via service role (webhook/workers — bypasses RLS)
- `posts` — INSERT by Ensemble webhook handler
- `post_metrics` — INSERT by metrics worker
- `retry_queue` — INSERT/UPDATE by workers
- `brands` — INSERT by agency via `lib/actions/brands.ts` (service client — crosses user boundaries)
- `brand_invitations` — INSERT by agency, UPDATE (accepted_at) on acceptance
- `workspaces` — INSERT via `acceptBrandInvitation` (brand admin isn't a member yet at creation time)
- `workspace_members` — INSERT via `acceptBrandInvitation` (same reason)

### RLS on brands and brand_invitations

`brands` and `brand_invitations` are written exclusively via service client in `lib/actions/brands.ts`. RLS policies:
- `brands`: agency user can SELECT their own brands (`agency_id = auth.uid()`)
- `brand_invitations`: no direct user access — all reads/writes go through service client

Users can `UPDATE posts.collab_status` via the user-scoped client (RLS allows editor+).

---

## 7. Indexes

```sql
-- Used in every RLS policy (critical)
create index idx_workspace_members_user_id on workspace_members (user_id);

-- Brand onboarding token lookup
create index idx_brand_invitations_token on brand_invitations (token) where accepted_at is null;
create index idx_brands_agency_id on brands (agency_id);
create index idx_brands_slug on brands (slug);

-- Campaign listing
create index idx_campaigns_workspace_status on campaigns (workspace_id, status);
create index idx_campaigns_workspace_created on campaigns (workspace_id, created_at desc);

-- Post listing (most common query)
create index idx_posts_workspace_detected on posts (workspace_id, detected_at desc);
create index idx_posts_campaign_posted on posts (campaign_id, posted_at desc);

-- Webhook: find influencer by Ensemble ID
create index idx_influencers_ensemble_id on influencers (ensemble_id) where ensemble_id is not null;

-- Metrics cron: find posts ready for metrics
create index idx_posts_metrics_fetch_due on posts (metrics_fetch_after) where metrics_fetched_at is null;

-- Worker polling
create index idx_retry_queue_pending on retry_queue (scheduled_at) where status = 'pending';

-- Analytics queries
create index idx_post_metrics_workspace on post_metrics (workspace_id);
create index idx_posts_workspace_platform on posts (workspace_id, platform);
```

---

## 8. Common Query Patterns

### Get campaigns for a workspace with post count
```typescript
const { data } = await supabase
  .from('campaigns')
  .select('*, posts(count)')
  .eq('workspace_id', workspaceId)
  .order('created_at', { ascending: false })
```

### Get posts for a campaign with influencer + metrics
```typescript
const { data } = await supabase
  .from('posts')
  .select(`
    id, platform, post_url, caption, thumbnail_url,
    posted_at, detected_at, download_status, blocked_reason,
    drive_folder_path, collab_status,
    influencers ( id, full_name, ig_handle, tiktok_handle, profile_pic_url ),
    post_metrics ( views, likes, comments, engagement_rate, emv )
  `)
  .eq('campaign_id', campaignId)
  .order('posted_at', { ascending: false })
```

### Get influencers with usage rights for a campaign
```typescript
const { data } = await supabase
  .from('campaign_influencers')
  .select(`
    id, usage_rights, monitoring_status, added_at,
    influencers ( id, full_name, ig_handle, tiktok_handle, youtube_handle, profile_pic_url )
  `)
  .eq('campaign_id', campaignId)
  .order('added_at', { ascending: false })
```

### Get workspace influencer roster with campaign count
```typescript
const { data } = await supabase
  .from('influencers')
  .select('*, campaign_influencers(count)')
  .eq('workspace_id', workspaceId)
  .order('full_name')
```

### Analytics aggregate for a workspace + date range
```typescript
const { data } = await supabase
  .from('post_metrics')
  .select(`
    views, likes, comments, engagement_rate, emv,
    posts!inner ( platform, campaign_id, posted_at, influencer_id )
  `)
  .eq('workspace_id', workspaceId)
  .gte('posts.posted_at', startDate)
  .lte('posts.posted_at', endDate)
```

### Upsert tracking config
```typescript
const { error } = await supabase
  .from('campaign_tracking_configs')
  .upsert(
    { campaign_id, platform, hashtags, mentions },
    { onConflict: 'campaign_id,platform' }
  )
```

### Toggle usage rights (optimistic in UI, confirm via Server Action)
```typescript
const { error } = await supabase
  .from('campaign_influencers')
  .update({
    usage_rights: newValue,
    usage_rights_updated_at: new Date().toISOString(),
  })
  .eq('id', campaignInfluencerId)
```

### Enqueue a download job (service client only)
```typescript
const { error } = await serviceClient
  .from('retry_queue')
  .insert({ post_id, job_type: 'download', status: 'pending' })
```

### Claim jobs in worker (prevents double-processing)
```typescript
// Use Supabase RPC or raw SQL via service client
// FOR UPDATE SKIP LOCKED ensures only one worker processes each job
const { data: jobs } = await serviceClient.rpc('claim_retry_jobs', {
  p_job_type: 'download',
  p_limit: 10,
})
```

### Validate a brand onboarding token (service client — used in acceptBrandInvitation)
```typescript
const { data: invitation } = await serviceClient
  .from('brand_invitations')
  .select('id, brand_id, expires_at, accepted_at, brands(id, name, slug, status, agency_id)')
  .eq('token', token)
  .single()

// Validations (throw/return error if any fail):
// 1. invitation exists
// 2. invitation.expires_at > new Date()
// 3. invitation.accepted_at === null
// 4. invitation.brands.status === 'pending'
```

### Create brand + generate onboarding token (service client — lib/actions/brands.ts)
```typescript
// Step 1: Insert brand
const { data: brand } = await serviceClient
  .from('brands')
  .insert({ agency_id: user.id, name, slug: toSlug(name), status: 'pending' })
  .select('id, slug')
  .single()

// Step 2: Generate token
const token = crypto.randomBytes(32).toString('hex')
await serviceClient
  .from('brand_invitations')
  .insert({ brand_id: brand.id, token, expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() })

// Onboarding link:
const link = `${process.env.NEXT_PUBLIC_APP_URL}/onboard/${token}`
```

### Dev: Seed a test brand + token (run in Supabase SQL Editor — local dev only)
```sql
-- 1. Insert test brand
INSERT INTO brands (agency_id, name, slug, status)
VALUES ('your-dev-user-id', 'Test Brand', 'test-brand', 'pending')
RETURNING id;

-- 2. Seed a known dev token (never expires for dev convenience)
INSERT INTO brand_invitations (brand_id, token, expires_at)
VALUES ('brand-id-from-above', 'dev-test-token-123', now() + INTERVAL '999 days');

-- Then open: http://localhost:3000/onboard/dev-test-token-123
```
```

---

## 9. pg_cron Jobs

These are defined in `0001_initial_schema.sql` and registered automatically:

```sql
-- End expired campaigns daily
select cron.schedule('end-expired-campaigns', '0 0 * * *', $$
  update campaigns set status = 'ended'
  where status = 'active' and end_date < current_date
$$);

-- Pause monitoring for ended campaigns
select cron.schedule('pause-ended-monitoring', '5 0 * * *', $$
  update campaign_influencers
  set monitoring_status = 'paused'
  where campaign_id in (select id from campaigns where status = 'ended')
    and monitoring_status != 'paused'
$$);

-- Enqueue metrics fetch for eligible posts
select cron.schedule('enqueue-metrics-fetch', '0 * * * *', $$
  insert into retry_queue (post_id, job_type, status)
  select p.id, 'metrics_fetch', 'pending'
  from posts p
  where p.metrics_fetched_at is null
    and p.metrics_fetch_after <= now()
    and not exists (
      select 1 from retry_queue rq
      where rq.post_id = p.id
        and rq.job_type = 'metrics_fetch'
        and rq.status in ('pending', 'processing')
    )
$$);

-- Cleanup old completed jobs
select cron.schedule('cleanup-retry-queue', '0 1 * * *', $$
  delete from retry_queue
  where status in ('done', 'failed')
    and processed_at < now() - interval '30 days'
$$);
```

---

## 10. Seed Data

After creating a new workspace, call:
```typescript
await supabase.rpc('seed_workspace_defaults', { p_workspace_id: workspace.id })
```

This inserts the default EMV CPM rates:
- Instagram: `$5.20` CPM
- TikTok: `$3.80` CPM
- YouTube: `$7.50` CPM

---

## 11. Supabase Client Usage Rules

### `createClient()` — user-scoped (use everywhere in UI)
```typescript
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
```
- Uses the user's session cookie
- RLS automatically enforced — returns only workspace data the user belongs to
- Safe in Server Components, Server Actions, layouts, and pages

### `createServiceClient()` — admin (use only in 3 places)
```typescript
import { createServiceClient } from '@/lib/supabase/server'
const serviceClient = createServiceClient()
```
- Uses `SUPABASE_SERVICE_ROLE_KEY`
- Bypasses ALL RLS — can read/write any row in any table
- **Only allowed in:** webhook handler, workspace creation, invitation acceptance
- **Never** in a component that renders to the browser

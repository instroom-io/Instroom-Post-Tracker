# Database — Instroom

> Migration file: `supabase/migrations/0001_initial_schema.sql`
> Brand request flow migration: `supabase/migrations/0002_brand_requests.sql`
> Multi-agency platform migration: `supabase/migrations/0011_multi_agency_platform.sql`
>
> **Apply migrations:** `npm run db:push`
> **Regenerate TypeScript types:** `npm run db:generate`
> **Local Studio:** `npx supabase studio`
> **Reset local DB:** `npx supabase db reset`

---

## 1. Tables Overview

| Table | Purpose |
|-------|---------|
| `users` | Public user profiles (mirrors `auth.users`); `is_platform_admin` flag for Instroom admins |
| `agencies` | Marketing agencies — each is a Tier 2 operator in the 3-tier platform |
| `agency_requests` | Inbound agency registration requests reviewed by platform admin |
| `brand_requests` | Inbound brand connection requests via `/request-access` (status: pending → approved / rejected) |
| `workspaces` | One per brand client — billing + isolation unit; `agency_id` FK links to owning agency |
| `workspace_members` | User ↔ workspace with role (agency staff + brand users with `role='brand'`) |
| `workspace_platform_handles` | Brand's own social accounts (for exclusion logic) |
| `invitations` | Pending email invitations for agency team members (token-based) |
| `campaigns` | Campaign definition with date window |
| `campaign_tracking_configs` | Hashtags + mentions to watch, per platform per campaign |
| `influencers` | Influencer roster scoped to a workspace |
| `campaign_influencers` | Which influencers are in each campaign + usage rights |
| `posts` | Detected posts (1 row per post × campaign match) |
| `post_metrics` | Frozen 7-day analytics snapshot per post |
| `emv_config` | CPM rates per platform per workspace |
| `retry_queue` | Async job queue for downloads + metrics fetches |

> **Removed tables (from previous design):**
> `brands` and `brand_invitations` were part of the agency-generated invite link flow (original Flow 0).
> That flow has been replaced by the brand request form + agency approval flow (see WORKFLOWS.md Flow 0).
> If these tables exist in an existing migration, leave them in place but do not use them — they will be dropped in a future cleanup migration.

---

## 2. Full Schema

### `users`
```sql
id                  uuid primary key references auth.users on delete cascade
email               text not null unique
full_name           text
avatar_url          text
is_platform_admin   boolean not null default false   -- Instroom super admin flag
created_at          timestamptz default now()
```

> `is_platform_admin` is set manually in the DB for Instroom staff. Never set via user-facing UI.

### `agencies`
```sql
id          uuid primary key default gen_random_uuid()
name        text not null
slug        text not null unique
owner_id    uuid references auth.users   -- agency owner; set on approval
status      agency_status not null default 'pending'  -- enum: pending|active|suspended
logo_url    text
created_at  timestamptz default now()
```

> `owner_id` may temporarily be the approving platform admin if the agency contact hasn't signed up yet.

### `agency_requests`
```sql
id              uuid primary key default gen_random_uuid()
agency_name     text not null
website_url     text not null
contact_name    text not null
contact_email   text not null
description     text
status          agency_request_status not null default 'pending'  -- enum: pending|approved|rejected
reviewed_by     uuid references users
reviewed_at     timestamptz
created_at      timestamptz default now()
```

### `brand_requests`
```sql
id                      uuid primary key default gen_random_uuid()
brand_name              text not null
website_url             text not null
contact_name            text not null
contact_email           text not null
description             text
agency_id               uuid references agencies                     -- which agency this brand chose
status                  brand_request_status not null default 'pending'  -- enum: pending|approved|rejected
workspace_id            uuid references workspaces                   -- set on approval
onboard_token           text unique                                  -- 32-byte hex, set on approval
onboard_token_expires_at timestamptz                                 -- token expiry
onboard_accepted_at     timestamptz                                  -- when brand clicked Confirm
reviewed_by             uuid references users                        -- agency user who approved/rejected
reviewed_at             timestamptz
created_at              timestamptz default now()
```

> `workspace_id` is null until the request is approved. On approval, the auto-created workspace ID is stored here for traceability.
> `onboard_token` is generated on approval and emailed to the brand contact. Used at `/onboard/[token]`.
> `reviewed_by` + `reviewed_at` provide a full audit trail of who approved or rejected each request.

### `workspaces`
```sql
id                    uuid primary key default gen_random_uuid()
name                  text not null
slug                  text not null unique
logo_url              text
agency_id             uuid references agencies                -- which agency owns this workspace (nullable for legacy)
drive_connection_type drive_connection_type   -- enum: 'agency' | 'brand' (null until Drive connected)
drive_oauth_token     text                    -- encrypted OAuth refresh token (pgcrypto / Supabase Vault)
drive_folder_id       text                    -- root Drive folder ID for this workspace
created_at            timestamptz default now()
```

> `agency_id` links the workspace to its owning agency. Set on approval of a brand request.
> `drive_connection_type`, `drive_oauth_token`, and `drive_folder_id` are all null until the agency connects Drive in workspace settings.
> `drive_oauth_token` must be encrypted at rest. Use `pgcrypto` `pgp_sym_encrypt` or Supabase Vault.

### `workspace_members`
```sql
id            uuid primary key default gen_random_uuid()
workspace_id  uuid not null references workspaces on delete cascade
user_id       uuid not null references users on delete cascade
role          workspace_role not null  -- enum: owner|admin|editor|viewer|brand
invited_by    uuid references users
joined_at     timestamptz default now()
unique (workspace_id, user_id)
```

> `viewer` role is for agency staff with read-only access (e.g. account directors).
> `brand` role is for brand users who accepted the onboarding link. They can only access `/[slug]/portal`, not the dashboard.

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
expires_at    timestamptz not null  -- now() + 7 days
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
tiktok_sec_uid   text
youtube_handle   text
youtube_channel_id text
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
metrics_fetch_after timestamptz not null  -- = posted_at + 7 days
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
engagement_rate  numeric(6,4) not null default 0
emv              numeric(12,2) not null default 0
emv_cpm_used     numeric(8,2) not null
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
job_type      job_type not null
status        job_status not null default 'pending'
attempts      int not null default 0
scheduled_at  timestamptz not null default now()
processed_at  timestamptz
error         text
```

---

## 3. Enums

```sql
create type brand_request_status  as enum ('pending', 'approved', 'rejected');
create type agency_status         as enum ('pending', 'active', 'suspended');
create type agency_request_status as enum ('pending', 'approved', 'rejected');
create type drive_connection_type as enum ('agency', 'brand');
create type platform_type         as enum ('instagram', 'tiktok', 'youtube');
create type workspace_role        as enum ('owner', 'admin', 'editor', 'viewer', 'brand');
create type campaign_status       as enum ('draft', 'active', 'ended');
create type monitoring_status     as enum ('pending', 'active', 'paused');
create type download_status       as enum ('pending', 'downloaded', 'blocked', 'failed');
create type collab_status         as enum ('n/a', 'pending', 'confirmed', 'not_added');
create type job_type              as enum ('download', 'metrics_fetch');
create type job_status            as enum ('pending', 'processing', 'done', 'failed');
```

> **Added in 0011_multi_agency_platform.sql:**
> `agency_status` — for the `agencies` table.
> `agency_request_status` — for the `agency_requests` table.
> `workspace_role` gained `'brand'` value — for brand users who have read-only portal access.

> **Removed enums (from previous design):**
> `brand_status` (`pending` | `active`) — was used by the `brands` table, no longer needed.

---

## 4. Key Constraints

### Post deduplication
```sql
unique (ensemble_post_id, campaign_id)
```
`ensemble_post_id` alone is NOT unique — same post can match multiple campaigns.

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
Metrics written once, never updated. Second INSERT errors intentionally.

---

## 5. Triggers

### `handle_new_user` — on `auth.users` INSERT
Creates a `public.users` profile row on signup. `ON CONFLICT DO NOTHING`.

### `campaign_status_on_update` — on `campaigns` UPDATE
Auto-sets `status = 'ended'` when `end_date < current_date AND status = 'active'`.

### `posts_collab_status_default` — on `posts` INSERT
Sets `collab_status = 'n/a'` for non-Instagram, `'pending'` for Instagram.

---

## 6. RLS Policies

### The workspace membership helper
```sql
create function public.my_workspace_ids()
returns setof uuid language sql security definer stable as $$
  select workspace_id from workspace_members where user_id = auth.uid()
$$;
```

### `brand_requests` RLS
```sql
-- Agency staff can view all pending/approved/rejected requests
create policy "Agency can view brand requests"
  on brand_requests for select
  using (auth.uid() is not null);

-- Anyone (unauthenticated) can submit a request — INSERT via service client only
-- No direct user INSERT policy — submitBrandRequest() uses service client
```

> `brand_requests` INSERT goes through `submitBrandRequest()` Server Action using the service client — no user auth required for submission, but we don't expose a direct RLS INSERT policy to anonymous users either.

### Standard workspace tables (campaigns, influencers, posts, etc.)
Same RLS pattern as before — `workspace_id in (select public.my_workspace_ids())`.

### Write permissions by role

| Action | Minimum role |
|--------|-------------|
| View all data | `viewer` |
| Create/edit campaigns | `editor` |
| Toggle usage rights | `editor` |
| Update collab status | `editor` |
| Add/remove campaign influencers | `editor` |
| Invite/remove workspace members | `admin` |
| Delete campaigns | `admin` |
| Update workspace settings | `admin` |
| Change EMV config | `admin` |
| Approve/reject brand requests | `owner` (agency only) |
| Connect Google Drive | `admin` |

### Tables written only via service role
- `posts` — INSERT by Ensemble webhook handler
- `post_metrics` — INSERT by metrics worker
- `retry_queue` — INSERT/UPDATE by workers
- `brand_requests` — INSERT by `submitBrandRequest()` (unauthenticated public form)
- `workspaces` — INSERT via `approveBrandRequest()` (brand not a member yet)
- `workspace_members` — INSERT via `approveBrandRequest()` (same reason)

---

## 7. Indexes

```sql
-- Used in every RLS policy (critical)
create index idx_workspace_members_user_id on workspace_members (user_id);

-- Brand request listing
create index idx_brand_requests_status on brand_requests (status, created_at desc);
create index idx_brand_requests_contact_email on brand_requests (contact_email);

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

### Get pending brand requests (agency dashboard)
```typescript
const { data } = await supabase
  .from('brand_requests')
  .select('id, brand_name, website_url, contact_name, contact_email, description, created_at')
  .eq('status', 'pending')
  .order('created_at', { ascending: true })
```

### Approve a brand request (service client — lib/actions/brand-requests.ts)
```typescript
// Inside a transaction via RPC or sequential service client calls:

// 1. Re-validate still pending
const { data: request } = await serviceClient
  .from('brand_requests')
  .select('*')
  .eq('id', requestId)
  .eq('status', 'pending')
  .single()

// 2. Create workspace
const { data: workspace } = await serviceClient
  .from('workspaces')
  .insert({ name: request.brand_name, slug: toSlug(request.brand_name) })
  .select('id, slug')
  .single()

// 3. Add agency user as owner
await serviceClient
  .from('workspace_members')
  .insert({ workspace_id: workspace.id, user_id: agencyUserId, role: 'owner' })

// 4. Seed EMV defaults
await serviceClient.rpc('seed_workspace_defaults', { p_workspace_id: workspace.id })

// 5. Mark request as approved
await serviceClient
  .from('brand_requests')
  .update({ status: 'approved', workspace_id: workspace.id, reviewed_by: agencyUserId, reviewed_at: new Date().toISOString() })
  .eq('id', requestId)
```

### Submit a brand request (service client — public, no auth)
```typescript
const { error } = await serviceClient
  .from('brand_requests')
  .insert({
    brand_name, website_url, contact_name, contact_email, description,
    status: 'pending'
  })
```

### Connect Google Drive to a workspace
```typescript
const { error } = await supabase
  .from('workspaces')
  .update({
    drive_connection_type: 'agency', // or 'brand'
    drive_oauth_token: encryptedToken,
    drive_folder_id: rootFolderId,
  })
  .eq('id', workspaceId)
```

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

### Dev: Seed a test brand request (run in Supabase SQL Editor — local dev only)
```sql
INSERT INTO brand_requests (brand_name, website_url, contact_name, contact_email, status)
VALUES ('Test Brand', 'https://testbrand.com', 'Jane Cruz', 'jane@testbrand.com', 'pending');

-- Then open: http://localhost:3000/agency/requests and approve from the UI
```

---

## 9. pg_cron Jobs
*(Unchanged — same as original DATABASE.md §9)*

---

## 10. Seed Data
*(Unchanged — same as original DATABASE.md §10)*

---

## 11. Supabase Client Usage Rules

### `createClient()` — user-scoped
Used everywhere in UI. RLS automatically enforced.

### `createServiceClient()` — admin, bypasses RLS
**Only allowed in:**
1. `app/api/webhooks/ensemble/route.ts`
2. `lib/actions/brand-requests.ts` — public form submission, approval, rejection
3. `lib/actions/agencies.ts` — agency creation + request approval (no membership row exists yet for agency owner)
4. `lib/actions/brands.ts` — brand onboarding acceptance (`workspace_members` insert for brand user)
5. `lib/actions/workspace.ts` — team member invitation acceptance
6. `app/api/cron/download-worker/route.ts`
7. `app/api/cron/metrics-worker/route.ts`

**Never in a component that renders UI.**

---

## 12. Migration Plan

### `0001_initial_schema.sql` — existing
Contains the original schema including `brands` and `brand_invitations`. Leave as-is.

### `0011_multi_agency_platform.sql` — new
```sql
-- New enums
create type agency_status         as enum ('pending', 'active', 'suspended');
create type agency_request_status as enum ('pending', 'approved', 'rejected');

-- New table: agencies
create table agencies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  owner_id    uuid references auth.users,
  status      agency_status not null default 'pending',
  logo_url    text,
  created_at  timestamptz default now()
);

-- New table: agency_requests
create table agency_requests (
  id              uuid primary key default gen_random_uuid(),
  agency_name     text not null,
  website_url     text not null,
  contact_name    text not null,
  contact_email   text not null,
  description     text,
  status          agency_request_status not null default 'pending',
  reviewed_by     uuid references public.users,
  reviewed_at     timestamptz,
  created_at      timestamptz default now()
);

-- Add is_platform_admin to users
alter table public.users add column is_platform_admin boolean not null default false;

-- Add agency_id to workspaces
alter table workspaces add column agency_id uuid references agencies;

-- Add multi-agency columns to brand_requests
alter table brand_requests
  add column agency_id               uuid references agencies,
  add column onboard_token           text unique,
  add column onboard_token_expires_at timestamptz,
  add column onboard_accepted_at     timestamptz;

-- Add brand to workspace_role enum
alter type workspace_role add value 'brand';
```

### `0002_brand_requests.sql` — existing
```sql
-- New enum
create type brand_request_status as enum ('pending', 'approved', 'rejected');
create type drive_connection_type as enum ('agency', 'brand');

-- New table: brand_requests
create table brand_requests (
  id              uuid primary key default gen_random_uuid(),
  brand_name      text not null,
  website_url     text not null,
  contact_name    text not null,
  contact_email   text not null,
  description     text,
  status          brand_request_status not null default 'pending',
  workspace_id    uuid references workspaces,
  reviewed_by     uuid references users,
  reviewed_at     timestamptz,
  created_at      timestamptz default now()
);

-- Add Drive columns to workspaces
alter table workspaces
  add column drive_connection_type drive_connection_type,
  add column drive_oauth_token     text,
  add column drive_folder_id       text;

-- Indexes
create index idx_brand_requests_status on brand_requests (status, created_at desc);
create index idx_brand_requests_contact_email on brand_requests (contact_email);

-- RLS
alter table brand_requests enable row level security;

create policy "Authenticated users can view brand requests"
  on brand_requests for select
  using (auth.uid() is not null);

-- Note: INSERT is via service client only (submitBrandRequest Server Action)
-- No direct user INSERT policy needed
```
-- ─── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";

-- ─── Enums ────────────────────────────────────────────────────────────────────

create type platform_type as enum ('instagram', 'tiktok', 'youtube');
create type workspace_role as enum ('owner', 'admin', 'editor', 'viewer');
create type campaign_status as enum ('draft', 'active', 'ended');
create type monitoring_status as enum ('pending', 'active', 'paused');
create type download_status as enum ('pending', 'downloaded', 'blocked', 'failed');
create type collab_status as enum ('n/a', 'pending', 'confirmed', 'not_added');
create type job_type as enum ('download', 'metrics_fetch');
create type job_status as enum ('pending', 'processing', 'done', 'failed');

-- ─── Users ────────────────────────────────────────────────────────────────────

create table public.users (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null unique,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

-- Trigger: create user profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Workspaces ───────────────────────────────────────────────────────────────

create table public.workspaces (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  logo_url         text,
  drive_folder_id  text,
  created_at       timestamptz not null default now()
);

alter table public.workspaces enable row level security;

-- ─── Workspace Members ────────────────────────────────────────────────────────

create table public.workspace_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces on delete cascade,
  user_id       uuid not null references public.users on delete cascade,
  role          workspace_role not null default 'viewer',
  invited_by    uuid references public.users,
  joined_at     timestamptz not null default now(),
  unique(workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

-- ─── RLS Helper Function ──────────────────────────────────────────────────────

create or replace function public.my_workspace_ids()
returns setof uuid language sql security definer stable as $$
  select workspace_id
  from public.workspace_members
  where user_id = auth.uid();
$$;

-- ─── Workspace RLS ────────────────────────────────────────────────────────────

create policy "Members can view their workspaces"
  on public.workspaces for select
  using (id in (select public.my_workspace_ids()));

create policy "Admins can update workspace"
  on public.workspaces for update
  using (
    id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Workspace members RLS
create policy "Members can view workspace members"
  on public.workspace_members for select
  using (workspace_id in (select public.my_workspace_ids()));

create policy "Admins can insert workspace members"
  on public.workspace_members for insert
  with check (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Admins can update workspace members"
  on public.workspace_members for update
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Admins can delete workspace members"
  on public.workspace_members for delete
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ─── Workspace Platform Handles ───────────────────────────────────────────────

create table public.workspace_platform_handles (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces on delete cascade,
  platform      platform_type not null,
  handle        text not null,
  display_name  text,
  unique(workspace_id, platform, handle)
);

alter table public.workspace_platform_handles enable row level security;

create policy "Members can view platform handles"
  on public.workspace_platform_handles for select
  using (workspace_id in (select public.my_workspace_ids()));

create policy "Admins can manage platform handles"
  on public.workspace_platform_handles for all
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ─── Invitations ──────────────────────────────────────────────────────────────

create table public.invitations (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces on delete cascade,
  email         text not null,
  role          workspace_role not null default 'editor',
  token         text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at    timestamptz not null default (now() + interval '7 days'),
  accepted_at   timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.invitations enable row level security;

create policy "Anyone can view invitations by token (for acceptance)"
  on public.invitations for select
  using (true);

create policy "Admins can create invitations"
  on public.invitations for insert
  with check (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Admins can delete invitations"
  on public.invitations for delete
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ─── Campaigns ────────────────────────────────────────────────────────────────

create table public.campaigns (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces on delete cascade,
  name          text not null,
  platforms     platform_type[] not null default '{}',
  start_date    date not null,
  end_date      date not null,
  status        campaign_status not null default 'draft',
  drive_folder_id text,
  created_by    uuid not null references public.users,
  created_at    timestamptz not null default now(),
  check (end_date >= start_date)
);

alter table public.campaigns enable row level security;

create policy "Members can view campaigns"
  on public.campaigns for select
  using (workspace_id in (select public.my_workspace_ids()));

create policy "Editors can create campaigns"
  on public.campaigns for insert
  with check (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'editor')
    )
  );

create policy "Editors can update campaigns"
  on public.campaigns for update
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'editor')
    )
  );

create policy "Admins can delete campaigns"
  on public.campaigns for delete
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Trigger: auto-end campaigns when date conditions met
create or replace function public.campaign_status_on_update()
returns trigger language plpgsql as $$
begin
  if new.end_date < current_date and new.status = 'active' then
    new.status = 'ended';
  end if;
  return new;
end;
$$;

create trigger campaign_auto_end
  before update on public.campaigns
  for each row execute procedure public.campaign_status_on_update();

-- ─── Campaign Tracking Configs ────────────────────────────────────────────────

create table public.campaign_tracking_configs (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns on delete cascade,
  platform     platform_type not null,
  hashtags     text[] not null default '{}',
  mentions     text[] not null default '{}',
  unique(campaign_id, platform)
);

alter table public.campaign_tracking_configs enable row level security;

create policy "Members can view tracking configs"
  on public.campaign_tracking_configs for select
  using (
    campaign_id in (
      select id from public.campaigns
      where workspace_id in (select public.my_workspace_ids())
    )
  );

create policy "Editors can manage tracking configs"
  on public.campaign_tracking_configs for all
  using (
    campaign_id in (
      select c.id from public.campaigns c
      join public.workspace_members wm on wm.workspace_id = c.workspace_id
      where wm.user_id = auth.uid() and wm.role in ('owner', 'admin', 'editor')
    )
  );

-- ─── Influencers ──────────────────────────────────────────────────────────────

create table public.influencers (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces on delete cascade,
  full_name        text not null,
  ensemble_id      text,
  ig_handle        text,
  tiktok_handle    text,
  youtube_handle   text,
  profile_pic_url  text,
  created_at       timestamptz not null default now()
);

alter table public.influencers enable row level security;

create policy "Members can view influencers"
  on public.influencers for select
  using (workspace_id in (select public.my_workspace_ids()));

create policy "Editors can manage influencers"
  on public.influencers for all
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'editor')
    )
  );

-- ─── Campaign Influencers ─────────────────────────────────────────────────────

create table public.campaign_influencers (
  id                        uuid primary key default gen_random_uuid(),
  campaign_id               uuid not null references public.campaigns on delete cascade,
  influencer_id             uuid not null references public.influencers on delete cascade,
  usage_rights              boolean not null default false,
  usage_rights_updated_at   timestamptz,
  ensemble_tracking_id      text,
  monitoring_status         monitoring_status not null default 'pending',
  added_by                  uuid not null references public.users,
  added_at                  timestamptz not null default now(),
  unique(campaign_id, influencer_id)
);

alter table public.campaign_influencers enable row level security;

create policy "Members can view campaign influencers"
  on public.campaign_influencers for select
  using (
    campaign_id in (
      select id from public.campaigns
      where workspace_id in (select public.my_workspace_ids())
    )
  );

create policy "Editors can manage campaign influencers"
  on public.campaign_influencers for all
  using (
    campaign_id in (
      select c.id from public.campaigns c
      join public.workspace_members wm on wm.workspace_id = c.workspace_id
      where wm.user_id = auth.uid() and wm.role in ('owner', 'admin', 'editor')
    )
  );

-- ─── Posts ────────────────────────────────────────────────────────────────────

create table public.posts (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references public.workspaces on delete cascade,
  campaign_id          uuid not null references public.campaigns on delete cascade,
  influencer_id        uuid not null references public.influencers on delete cascade,
  platform             platform_type not null,
  post_url             text not null,
  ensemble_post_id     text not null,
  caption              text,
  thumbnail_url        text,
  posted_at            timestamptz not null,
  detected_at          timestamptz not null default now(),
  download_status      download_status not null default 'pending',
  blocked_reason       text check (blocked_reason = 'no_usage_rights' or blocked_reason is null),
  drive_file_id        text,
  drive_folder_path    text,
  downloaded_at        timestamptz,
  collab_status        collab_status not null default 'n/a',
  collab_checked_by    uuid references public.users,
  metrics_fetch_after  timestamptz,
  metrics_fetched_at   timestamptz,
  unique(ensemble_post_id, campaign_id)
);

alter table public.posts enable row level security;

create policy "Members can view posts"
  on public.posts for select
  using (workspace_id in (select public.my_workspace_ids()));

create policy "Editors can update post collab status"
  on public.posts for update
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'editor')
    )
  );

-- Trigger: set collab_status default based on platform
create or replace function public.posts_collab_status_default()
returns trigger language plpgsql as $$
begin
  if new.platform = 'instagram' then
    new.collab_status = 'pending';
  else
    new.collab_status = 'n/a';
  end if;
  return new;
end;
$$;

create trigger set_collab_status_on_insert
  before insert on public.posts
  for each row execute procedure public.posts_collab_status_default();

-- Trigger: set metrics_fetch_after = posted_at + 7 days on insert
create or replace function public.posts_set_metrics_fetch_after()
returns trigger language plpgsql as $$
begin
  new.metrics_fetch_after := new.posted_at + interval '7 days';
  return new;
end;
$$;

create trigger set_metrics_fetch_after_on_insert
  before insert on public.posts
  for each row execute procedure public.posts_set_metrics_fetch_after();

-- ─── Post Metrics ─────────────────────────────────────────────────────────────

create table public.post_metrics (
  id               uuid primary key default gen_random_uuid(),
  post_id          uuid not null references public.posts on delete cascade unique,
  workspace_id     uuid not null references public.workspaces on delete cascade,
  views            bigint not null default 0,
  likes            bigint not null default 0,
  comments         bigint not null default 0,
  shares           bigint not null default 0,
  saves            bigint,
  follower_count   bigint not null default 0,
  engagement_rate  numeric(6, 4) not null default 0,
  emv              numeric(12, 2) not null default 0,
  emv_cpm_used     numeric(8, 2),
  fetched_at       timestamptz not null default now()
);

alter table public.post_metrics enable row level security;

create policy "Members can view post metrics"
  on public.post_metrics for select
  using (workspace_id in (select public.my_workspace_ids()));

-- ─── EMV Config ───────────────────────────────────────────────────────────────

create table public.emv_config (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces on delete cascade,
  platform      platform_type not null,
  cpm_rate      numeric(8, 2) not null,
  updated_at    timestamptz not null default now(),
  unique(workspace_id, platform)
);

alter table public.emv_config enable row level security;

create policy "Members can view EMV config"
  on public.emv_config for select
  using (workspace_id in (select public.my_workspace_ids()));

create policy "Admins can manage EMV config"
  on public.emv_config for all
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ─── Retry Queue ──────────────────────────────────────────────────────────────

create table public.retry_queue (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.posts on delete cascade,
  job_type      job_type not null,
  status        job_status not null default 'pending',
  attempts      int not null default 0,
  scheduled_at  timestamptz not null default now(),
  processed_at  timestamptz,
  error         text
);

alter table public.retry_queue enable row level security;

-- Retry queue is only accessed via service role (workers)
-- No user-facing RLS policies needed

-- ─── Seed Function ────────────────────────────────────────────────────────────

create or replace function public.seed_workspace_defaults(p_workspace_id uuid)
returns void language plpgsql security definer as $$
begin
  insert into public.emv_config (workspace_id, platform, cpm_rate)
  values
    (p_workspace_id, 'instagram', 5.20),
    (p_workspace_id, 'tiktok', 3.80),
    (p_workspace_id, 'youtube', 7.50)
  on conflict (workspace_id, platform) do nothing;
end;
$$;

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index idx_workspace_members_user_id on public.workspace_members (user_id);
create index idx_campaigns_workspace_status on public.campaigns (workspace_id, status);
create index idx_campaigns_workspace_created on public.campaigns (workspace_id, created_at desc);
create index idx_posts_workspace_detected on public.posts (workspace_id, detected_at desc);
create index idx_posts_campaign_posted on public.posts (campaign_id, posted_at desc);
create index idx_influencers_ensemble_id on public.influencers (ensemble_id);
create index idx_posts_metrics_fetch_due on public.posts (metrics_fetch_after) where metrics_fetched_at is null;
create index idx_retry_queue_pending on public.retry_queue (scheduled_at) where status = 'pending';
create index idx_post_metrics_workspace on public.post_metrics (workspace_id);
create index idx_posts_workspace_platform on public.posts (workspace_id, platform);

-- ─── pg_cron Jobs ─────────────────────────────────────────────────────────────

-- Auto-end expired campaigns daily at 00:00 UTC
select cron.schedule(
  'end-expired-campaigns',
  '0 0 * * *',
  $$
    update public.campaigns
    set status = 'ended'
    where status = 'active'
      and end_date < current_date
  $$
);

-- Pause monitoring for ended campaigns daily at 00:05 UTC
select cron.schedule(
  'pause-ended-monitoring',
  '5 0 * * *',
  $$
    update public.campaign_influencers
    set monitoring_status = 'paused'
    where campaign_id in (
      select id from public.campaigns where status = 'ended'
    )
    and monitoring_status != 'paused'
  $$
);

-- Enqueue metrics fetch jobs hourly
select cron.schedule(
  'enqueue-metrics-fetch',
  '0 * * * *',
  $$
    insert into public.retry_queue (post_id, job_type, status)
    select p.id, 'metrics_fetch', 'pending'
    from public.posts p
    where p.metrics_fetched_at is null
      and p.metrics_fetch_after <= now()
      and not exists (
        select 1 from public.retry_queue rq
        where rq.post_id = p.id
          and rq.job_type = 'metrics_fetch'
          and rq.status in ('pending', 'processing')
      )
  $$
);

-- Cleanup old retry queue entries daily at 01:00 UTC
select cron.schedule(
  'cleanup-retry-queue',
  '0 1 * * *',
  $$
    delete from public.retry_queue
    where status in ('done', 'failed')
      and processed_at < now() - interval '30 days'
  $$
);

create table public.brand_invites (
  id             uuid primary key default gen_random_uuid(),
  agency_id      uuid not null references public.agencies(id) on delete cascade,
  workspace_name text not null,
  email          text not null,
  token          text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by     uuid not null references auth.users(id) on delete cascade,
  expires_at     timestamptz not null default (now() + interval '7 days'),
  accepted_at    timestamptz,
  website_url    text,
  workspace_id   uuid references public.workspaces(id) on delete set null,
  created_at     timestamptz not null default now()
);

alter table public.brand_invites enable row level security;

create policy "Agency owner manages brand invites"
  on public.brand_invites for all
  using (
    agency_id in (select id from public.agencies where owner_id = auth.uid())
  );

create policy "Token holder can read brand invite"
  on public.brand_invites for select
  using (true);

create index idx_brand_invites_token     on public.brand_invites(token);
create index idx_brand_invites_agency_id on public.brand_invites(agency_id);

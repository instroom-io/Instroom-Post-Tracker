-- supabase/migrations/0020_followup_tracking.sql

-- Follow-up email timestamps on campaign_influencers
-- Null = email not yet sent. Set by followup-worker cron when email fires.
alter table public.campaign_influencers
  add column if not exists follow_up_1_sent_at timestamptz,
  add column if not exists follow_up_2_sent_at timestamptz;

-- One assigned team member per workspace receives follow-up notification emails.
-- Null = falls back to workspace owner.
alter table public.workspaces
  add column if not exists assigned_member_id uuid references public.users on delete set null;

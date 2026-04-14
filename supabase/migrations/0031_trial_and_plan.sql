-- supabase/migrations/0031_trial_and_plan.sql

-- Plan enum
CREATE TYPE plan_type AS ENUM ('trial', 'free', 'pro');

-- workspaces: add plan, trial tracking, and v2.0 account model columns
ALTER TABLE workspaces
  ADD COLUMN plan plan_type NOT NULL DEFAULT 'free',
  ADD COLUMN trial_started_at TIMESTAMPTZ,
  ADD COLUMN trial_ends_at TIMESTAMPTZ,
  ADD COLUMN trial_reminder_7_sent_at TIMESTAMPTZ,
  ADD COLUMN trial_reminder_12_sent_at TIMESTAMPTZ,
  ADD COLUMN trial_ended_notified_at TIMESTAMPTZ,
  ADD COLUMN account_type TEXT NOT NULL DEFAULT 'team',
  ADD COLUMN workspace_quota INT NOT NULL DEFAULT 3;

-- Note: DEFAULT 'free' (not 'trial') — existing workspaces are pre-trial legacy accounts.
-- New signups set plan='trial' and trial_ends_at explicitly in handlePostAuth().

-- Add 'manager' to workspace_role enum (v2.0 preferred term for new invites; 'editor' kept for data safety)
ALTER TYPE workspace_role ADD VALUE IF NOT EXISTS 'manager';

-- pg_cron: expire trials once daily at 00:30 UTC
SELECT cron.schedule(
  'expire-trials',
  '30 0 * * *',
  $$
    UPDATE workspaces
    SET plan = 'free'
    WHERE plan = 'trial'
      AND trial_ends_at < NOW();
  $$
);

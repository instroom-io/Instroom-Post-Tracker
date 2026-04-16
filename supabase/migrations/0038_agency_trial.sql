-- supabase/migrations/0038_agency_trial.sql
-- Add trial/plan billing columns to the agencies table so team accounts get a 14-day trial.
-- Mirrors the workspace trial system from 0031_trial_and_plan.sql.

-- ─── 1. Billing columns ────────────────────────────────────────────────────────
ALTER TABLE public.agencies
  ADD COLUMN plan        plan_type  NOT NULL DEFAULT 'free',
  ADD COLUMN trial_started_at TIMESTAMPTZ,
  ADD COLUMN trial_ends_at    TIMESTAMPTZ;

-- DEFAULT 'free' — existing agencies are pre-trial legacy accounts.
-- New team signups set plan='trial' and trial_ends_at explicitly in handlePostAuth().

-- ─── 2. pg_cron: expire agency trials ─────────────────────────────────────────
-- Runs 1 minute after workspace trial expiry (00:30 UTC) to avoid lock contention.
SELECT cron.schedule(
  'expire-agency-trials',
  '31 0 * * *',
  $$
    UPDATE public.agencies
    SET plan = 'free'
    WHERE plan = 'trial'
      AND trial_ends_at < NOW();
  $$
);

-- ─── 3. Billing column protection trigger ─────────────────────────────────────
-- Mirrors protect_workspace_billing_columns on workspaces (0034_billing_hardening.sql).
-- Prevents authenticated users from directly mutating billing columns;
-- only service_role (server actions, cron) can change them.

CREATE OR REPLACE FUNCTION protect_agency_billing_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    RAISE EXCEPTION 'Column "plan" can only be modified by the system';
  END IF;
  IF NEW.trial_started_at IS DISTINCT FROM OLD.trial_started_at THEN
    RAISE EXCEPTION 'Column "trial_started_at" can only be modified by the system';
  END IF;
  IF NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    RAISE EXCEPTION 'Column "trial_ends_at" can only be modified by the system';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_agency_billing_column_protection
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION protect_agency_billing_columns();

-- supabase/migrations/0034_billing_hardening.sql
-- Two hardening fixes:
-- 1. Prune webhook_events table daily (prevent unbounded growth)
-- 2. Protect billing columns on workspaces from direct user-facing writes

-- ─── 1. Webhook Events Pruning ────────────────────────────────────────────────
-- Delete idempotency records older than 30 days.
-- After 30 days, LS will never retry those events, so the keys are stale.
SELECT cron.schedule(
  'prune-webhook-events',
  '0 3 * * *',  -- 3 AM UTC daily (offset from expire-trials at 00:30)
  $$
    DELETE FROM webhook_events WHERE created_at < NOW() - INTERVAL '30 days';
  $$
);

-- ─── 2. Billing Column Protection Trigger ────────────────────────────────────
-- The workspaces RLS UPDATE policy lets owners/admins update workspace rows,
-- but only name, logo_url, and drive_folder_id should be user-writable.
-- Billing columns (plan, trial_*, account_type, workspace_quota) must only
-- be changed by the service_role (webhook handler, pg_cron jobs, server actions
-- that use createServiceClient()).
--
-- We use a BEFORE UPDATE trigger instead of RLS WITH CHECK because WITH CHECK
-- cannot reference OLD row values in Postgres, making column-level restrictions
-- impractical via RLS alone.

CREATE OR REPLACE FUNCTION protect_workspace_billing_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow all changes when called via service_role (webhooks, cron, admin actions)
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- For authenticated users: block direct changes to billing columns
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    RAISE EXCEPTION 'Column "plan" can only be modified by the system';
  END IF;
  IF NEW.trial_started_at IS DISTINCT FROM OLD.trial_started_at THEN
    RAISE EXCEPTION 'Column "trial_started_at" can only be modified by the system';
  END IF;
  IF NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    RAISE EXCEPTION 'Column "trial_ends_at" can only be modified by the system';
  END IF;
  IF NEW.account_type IS DISTINCT FROM OLD.account_type THEN
    RAISE EXCEPTION 'Column "account_type" can only be modified by the system';
  END IF;
  IF NEW.workspace_quota IS DISTINCT FROM OLD.workspace_quota THEN
    RAISE EXCEPTION 'Column "workspace_quota" can only be modified by the system';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_billing_column_protection
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION protect_workspace_billing_columns();

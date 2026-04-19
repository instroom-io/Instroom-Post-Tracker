-- supabase/migrations/0040_agency_trial_reminders.sql
-- Add trial reminder tracking columns to agencies so the trial-worker can send
-- 7-day, 2-day, and trial-ended emails to agency owners (mirrors workspaces).

-- ─── 1. Add reminder columns ──────────────────────────────────────────────────
ALTER TABLE public.agencies
  ADD COLUMN trial_reminder_7_sent_at  TIMESTAMPTZ,
  ADD COLUMN trial_reminder_2_sent_at  TIMESTAMPTZ,
  ADD COLUMN trial_ended_notified_at   TIMESTAMPTZ;

-- ─── 2. Protect new columns from direct user writes ───────────────────────────
-- Extend protect_agency_billing_columns (0038) to cover the new columns.
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
  IF NEW.trial_reminder_7_sent_at IS DISTINCT FROM OLD.trial_reminder_7_sent_at THEN
    RAISE EXCEPTION 'Column "trial_reminder_7_sent_at" can only be modified by the system';
  END IF;
  IF NEW.trial_reminder_2_sent_at IS DISTINCT FROM OLD.trial_reminder_2_sent_at THEN
    RAISE EXCEPTION 'Column "trial_reminder_2_sent_at" can only be modified by the system';
  END IF;
  IF NEW.trial_ended_notified_at IS DISTINCT FROM OLD.trial_ended_notified_at THEN
    RAISE EXCEPTION 'Column "trial_ended_notified_at" can only be modified by the system';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

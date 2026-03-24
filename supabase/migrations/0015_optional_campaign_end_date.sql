-- supabase/migrations/0015_optional_campaign_end_date.sql

-- 1. Drop NOT NULL constraint on end_date
ALTER TABLE public.campaigns ALTER COLUMN end_date DROP NOT NULL;

-- 2. Drop the anonymous inline check constraint and recreate it with explicit NULL support.
--    We target only the constraint referencing end_date to be safe.
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.campaigns'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%end_date%'
  LIMIT 1;
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.campaigns DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_date_check
  CHECK (end_date IS NULL OR end_date >= start_date);

-- NOTE: The campaign_auto_end trigger and the nightly pg_cron job both use
-- `end_date < current_date`. In Postgres, NULL < current_date evaluates to NULL
-- (falsy), so campaigns with no end_date are NEVER auto-ended. No changes needed.

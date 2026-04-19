-- supabase/migrations/0039_fix_webhook_events_pruning.sql
-- Fix: prune-webhook-events cron job used created_at which does not exist on
-- webhook_events. The correct column is processed_at (set in migration 0033).
-- Unschedule the broken job and recreate it with the right column name.

SELECT cron.unschedule('prune-webhook-events');

SELECT cron.schedule(
  'prune-webhook-events',
  '0 3 * * *',
  $$
    DELETE FROM webhook_events WHERE processed_at < NOW() - INTERVAL '30 days';
  $$
);

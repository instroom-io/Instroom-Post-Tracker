-- supabase/migrations/0026_campaign_archived_status.sql
-- Adds 'archived' to campaign_status enum.
-- Archived campaigns are hidden from the default list, stop being scraped,
-- and can be restored to 'draft' or permanently deleted.

ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'archived';

-- Migration: Add TikTok cursor-based pagination state to campaign_influencers
-- These columns allow the posts-worker to incrementally backfill TikTok posts
-- one page (depth=1, ~10 posts) per cron run, persisting cursor state between runs.

ALTER TABLE campaign_influencers
  ADD COLUMN IF NOT EXISTS tiktok_next_cursor TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tiktok_backfill_complete BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN campaign_influencers.tiktok_next_cursor IS
  'EnsembleData pagination cursor for the next TikTok backfill page. NULL = start from newest.';
COMMENT ON COLUMN campaign_influencers.tiktok_backfill_complete IS
  'True once the backfill has reached a post older than the campaign start_date. Switches to newest-posts monitoring mode.';

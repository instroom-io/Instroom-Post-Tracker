-- Add TikTok watermark column (mirrors ig_last_post_at / yt_last_post_at pattern)
ALTER TABLE campaign_influencers
  ADD COLUMN IF NOT EXISTS tiktok_last_post_at TIMESTAMPTZ;

-- Drop backfill columns (no longer needed — worker now uses watermark-only monitoring)
ALTER TABLE campaign_influencers
  DROP COLUMN IF EXISTS tiktok_next_cursor,
  DROP COLUMN IF EXISTS tiktok_backfill_complete;

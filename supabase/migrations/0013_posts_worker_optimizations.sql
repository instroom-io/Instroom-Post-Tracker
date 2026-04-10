-- Incremental cursor columns: timestamp of the most recently seen post per platform.
-- Updated every run (even for non-matching posts) so future runs skip already-checked content.
-- Mirrors the existing tiktok_next_cursor / tiktok_backfill_complete pattern for TikTok.
ALTER TABLE campaign_influencers
  ADD COLUMN ig_last_post_at  TIMESTAMPTZ NULL,
  ADD COLUMN yt_last_post_at  TIMESTAMPTZ NULL,
  ADD COLUMN stop_after_post  BOOLEAN NOT NULL DEFAULT FALSE;

-- New monitoring_status value: 'stopped' = automatically stopped after a matching post was detected.
-- Distinct from 'paused' (which is manual). Excluded from posts-worker scrape queries.
ALTER TYPE monitoring_status ADD VALUE IF NOT EXISTS 'stopped';

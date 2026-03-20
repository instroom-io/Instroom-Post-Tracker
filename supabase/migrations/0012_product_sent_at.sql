-- Add product_sent_at to campaign_influencers
-- Used by posts-worker as the TikTok backfill target (instead of campaign.start_date).
-- When set, only posts from this date onward are scraped — saves EnsembleData units.
-- Nullable: existing rows unaffected; missing value falls back to campaign.start_date.

alter table public.campaign_influencers
  add column if not exists product_sent_at date;

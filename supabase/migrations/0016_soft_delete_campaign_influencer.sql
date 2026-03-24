-- Soft-delete support for campaign_influencers
-- Adds 'removed' to monitoring_status enum so influencer removal is non-destructive.
-- Removed rows are excluded from scraping (posts-worker filters on 'pending'|'active')
-- and from UI queries, but posts and historical data are preserved.

ALTER TYPE monitoring_status ADD VALUE IF NOT EXISTS 'removed';

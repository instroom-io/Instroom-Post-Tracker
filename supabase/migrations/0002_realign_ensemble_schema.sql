-- ─── Migration: Realign EnsembleData Integration ──────────────────────────────
--
-- EnsembleData is a pull/scraping API with no webhooks and no internal IDs.
-- This migration removes fictional fields and adds real platform identifiers.
--

-- ─── Influencers ───────────────────────────────────────────────────────────────

-- Remove fictional Ensemble internal ID (EnsembleData has no such concept)
alter table public.influencers drop column if exists ensemble_id;

-- Add stable TikTok user identifier (sec_uid doesn't change when username changes)
-- Auto-populated by posts-worker on first successful TikTok scrape
alter table public.influencers add column if not exists tiktok_sec_uid text;

-- Add YouTube channel ID (required by /yt/channel/videos endpoint)
-- Auto-populated by posts-worker via /yt/channel/username-to-id lookup
alter table public.influencers add column if not exists youtube_channel_id text;

-- ─── Campaign Influencers ──────────────────────────────────────────────────────

-- Remove fictional Ensemble tracking ID
alter table public.campaign_influencers drop column if exists ensemble_tracking_id;

-- ─── Posts ────────────────────────────────────────────────────────────────────

-- Rename ensemble_post_id → platform_post_id
-- Stores platform-native IDs: TikTok aweme_id, Instagram shortcode, YouTube video ID
alter table public.posts rename column ensemble_post_id to platform_post_id;

-- Add direct media download URL (stored from EnsembleData scrape response)
-- TikTok: video.download_addr (watermark-free)
-- Instagram: image/video CDN URL from post response
-- YouTube: not applicable (linked externally)
alter table public.posts add column if not exists media_url text;

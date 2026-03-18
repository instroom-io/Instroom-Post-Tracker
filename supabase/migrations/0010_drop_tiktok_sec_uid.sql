-- Drop dead column: EnsembleData /tt/user/posts only accepts `username`, not sec_uid.
-- The sec_uid field appears in TikTok API responses but cannot be used as a lookup
-- parameter — unlike Instagram's user_id and YouTube's channel_id. This column was
-- never populated by the posts-worker and is always NULL.
ALTER TABLE public.influencers DROP COLUMN IF EXISTS tiktok_sec_uid;

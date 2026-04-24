-- Add avatar refresh timestamp to track staleness
-- null = never refreshed (triggers refresh on first worker run)
ALTER TABLE public.influencers
  ADD COLUMN IF NOT EXISTS profile_pic_refreshed_at timestamptz;

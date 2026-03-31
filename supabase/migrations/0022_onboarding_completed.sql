-- Add onboarding_completed flag to users table
-- New agency users must complete the onboarding survey before accessing the dashboard
ALTER TABLE public.users ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;

-- Grandfather existing users — they've already been using the platform
UPDATE public.users SET onboarding_completed = true;

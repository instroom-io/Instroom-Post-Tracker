-- Add Google OAuth token columns to users table for per-user Google Drive integration.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_access_token  TEXT,
  ADD COLUMN IF NOT EXISTS google_token_expiry  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS google_connected_email TEXT;

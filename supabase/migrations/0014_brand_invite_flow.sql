-- Add 'invited' status for agency-initiated brand invites
ALTER TYPE brand_request_status ADD VALUE IF NOT EXISTS 'invited';

-- Add invite token columns to brand_requests
ALTER TABLE public.brand_requests
  ADD COLUMN IF NOT EXISTS invite_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_token_expires_at timestamptz;

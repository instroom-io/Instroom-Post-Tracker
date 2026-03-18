-- Add onboarding confirmation token columns to brand_requests
-- Used when agency approves a brand request: a token is generated and emailed to the brand contact.
-- The brand clicks /onboard/[token] to confirm/acknowledge their onboarding.
-- Brand never creates an account — this is acknowledgment only.

ALTER TABLE brand_requests
  ADD COLUMN IF NOT EXISTS onboard_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS onboard_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboard_accepted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS brand_requests_onboard_token_idx ON brand_requests (onboard_token);

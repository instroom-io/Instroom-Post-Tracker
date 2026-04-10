-- Add Google OAuth columns to the agencies table.
-- Agency credentials are kept separate from the workspace owner's personal Google account
-- (stored in the users table) so connecting/disconnecting either is fully independent.

ALTER TABLE public.agencies
  ADD COLUMN google_connected_email  TEXT NULL,
  ADD COLUMN google_refresh_token    TEXT NULL,
  ADD COLUMN google_access_token     TEXT NULL,
  ADD COLUMN google_token_expiry     BIGINT NULL;

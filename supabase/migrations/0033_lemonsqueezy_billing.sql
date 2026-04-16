-- 0033_lemonsqueezy_billing.sql
-- Replace PayPal-specific billing tables with provider-agnostic schema.
-- Safe: DB is clean (zero subscribers), no data migration needed.

-- ── subscriptions ─────────────────────────────────────────────────────────────
-- Rename PayPal-specific column to provider-agnostic name
ALTER TABLE subscriptions
  RENAME COLUMN paypal_subscription_id TO provider_subscription_id;

-- Add provider column (backfill existing rows as 'lemonsqueezy' — table is empty)
ALTER TABLE subscriptions
  ADD COLUMN provider TEXT NOT NULL DEFAULT 'lemonsqueezy';

-- Replace PayPal-specific index with provider-scoped unique index
DROP INDEX IF EXISTS subscriptions_paypal_id_idx;
CREATE UNIQUE INDEX subscriptions_provider_id_idx
  ON subscriptions(provider, provider_subscription_id);

-- ── webhook_events ────────────────────────────────────────────────────────────
-- Drop PayPal-specific table (empty — no data loss)
DROP TABLE IF EXISTS paypal_webhook_events;

-- Create provider-agnostic webhook events table
-- Primary key is (provider, id) — id = "{event_name}:{data.id}" composite key
CREATE TABLE webhook_events (
  id           TEXT NOT NULL,
  provider     TEXT NOT NULL DEFAULT 'lemonsqueezy',
  event_type   TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider, id)
);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
-- No user-facing RLS policy needed — only service client writes here

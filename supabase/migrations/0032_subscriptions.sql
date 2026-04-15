-- supabase/migrations/0032_subscriptions.sql

-- subscriptions: one row per PayPal subscription per user
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paypal_subscription_id TEXT NOT NULL UNIQUE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('solo', 'team')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'cancelled', 'suspended')),
  extra_workspaces INT NOT NULL DEFAULT 0,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX subscriptions_paypal_id_idx ON subscriptions(paypal_subscription_id);

-- paypal_webhook_events: idempotency guard — one row per processed PayPal event
CREATE TABLE paypal_webhook_events (
  id TEXT PRIMARY KEY,         -- PayPal's event ID
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users can only read their own subscriptions; webhook handler uses service client
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

ALTER TABLE paypal_webhook_events ENABLE ROW LEVEL SECURITY;
-- No user-facing RLS needed — only service client writes here

-- Quiqlog Subscription Schema (Polar)
-- Run this in your Supabase SQL Editor after schema.sql

-- ============================================================
-- USER SUBSCRIPTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  polar_subscription_id TEXT,
  polar_customer_id     TEXT,
  status                TEXT NOT NULL DEFAULT 'inactive',
  -- status values: 'active', 'inactive', 'canceled'
  current_period_end    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS user_subscriptions_user_id_idx ON user_subscriptions(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own subscription
CREATE POLICY "subscriptions_select_own"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (used by webhook handler) can insert/update
-- No INSERT/UPDATE policy for regular users — only the webhook does this via service role

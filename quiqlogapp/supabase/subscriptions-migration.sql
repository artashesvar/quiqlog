-- Quiqlog Subscriptions Migration
-- Run this in your Supabase SQL Editor AFTER schema.sql

-- uuid-ossp is already enabled by schema.sql; this is a safety guard
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USER SUBSCRIPTIONS TABLE
-- ============================================================
-- One row per user (UNIQUE on user_id). Status reflects what Polar
-- last reported. The app treats 'active' and 'trialing' as having
-- full access; 'canceled' retains access until current_period_end.
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  polar_subscription_id TEXT,
  polar_customer_id     TEXT,
  -- Verbatim status from Polar: 'active' | 'trialing' | 'canceled' | 'inactive'
  status                TEXT NOT NULL DEFAULT 'inactive',
  current_period_end    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reuse the trigger function created in schema.sql
CREATE TRIGGER user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS user_subscriptions_user_id_idx
  ON user_subscriptions(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can SELECT only their own subscription row.
-- The editor page server component uses this to check access.
CREATE POLICY "subscriptions_select_own"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies for regular users.
-- The webhook route uses the service-role key (createAdminClient)
-- which bypasses RLS entirely — this is intentional and correct.

-- ============================================================
-- PERFORMANCE INDEX ON GUIDES TABLE
-- ============================================================
-- Speeds up the monthly guide-rank query in the editor page:
-- WHERE user_id = $1 AND created_at >= monthStart AND created_at < monthEnd AND created_at <= guideCreatedAt
CREATE INDEX IF NOT EXISTS guides_user_created_idx
  ON guides(user_id, created_at DESC);

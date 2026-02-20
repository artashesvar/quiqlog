-- Quiqlog Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- GUIDES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS guides (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL DEFAULT 'Untitled Guide',
  slug         TEXT UNIQUE NOT NULL,
  is_public    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on every update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guides_updated_at
  BEFORE UPDATE ON guides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for fast user guide lookups
CREATE INDEX IF NOT EXISTS guides_user_id_idx ON guides(user_id);
CREATE INDEX IF NOT EXISTS guides_slug_idx ON guides(slug);
CREATE INDEX IF NOT EXISTS guides_created_at_idx ON guides(created_at DESC);

-- ============================================================
-- STEPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS steps (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id        UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  order_index     INTEGER NOT NULL DEFAULT 0,
  title           TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  screenshot_url  TEXT,
  click_x         FLOAT,
  click_y         FLOAT,
  element_label   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS steps_guide_id_idx ON steps(guide_id);
CREATE INDEX IF NOT EXISTS steps_order_idx ON steps(guide_id, order_index);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on both tables
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;

-- ── Guides policies ──────────────────────────────────────────

-- Owners can SELECT their own guides
CREATE POLICY "guides_select_own"
  ON guides FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone can SELECT public guides
CREATE POLICY "guides_select_public"
  ON guides FOR SELECT
  USING (is_public = true);

-- Owners can INSERT
CREATE POLICY "guides_insert_own"
  ON guides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Owners can UPDATE
CREATE POLICY "guides_update_own"
  ON guides FOR UPDATE
  USING (auth.uid() = user_id);

-- Owners can DELETE
CREATE POLICY "guides_delete_own"
  ON guides FOR DELETE
  USING (auth.uid() = user_id);

-- ── Steps policies ───────────────────────────────────────────

-- Users can SELECT steps in their own guides
CREATE POLICY "steps_select_own"
  ON steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guides
      WHERE guides.id = steps.guide_id
        AND guides.user_id = auth.uid()
    )
  );

-- Anyone can SELECT steps in public guides
CREATE POLICY "steps_select_public"
  ON steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guides
      WHERE guides.id = steps.guide_id
        AND guides.is_public = true
    )
  );

-- Users can INSERT steps into their own guides
CREATE POLICY "steps_insert_own"
  ON steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guides
      WHERE guides.id = steps.guide_id
        AND guides.user_id = auth.uid()
    )
  );

-- Users can UPDATE steps in their own guides
CREATE POLICY "steps_update_own"
  ON steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM guides
      WHERE guides.id = steps.guide_id
        AND guides.user_id = auth.uid()
    )
  );

-- Users can DELETE steps in their own guides
CREATE POLICY "steps_delete_own"
  ON steps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM guides
      WHERE guides.id = steps.guide_id
        AND guides.user_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE BUCKET SETUP
-- Run separately in Supabase dashboard > Storage > New bucket
-- Name: screenshots, Public: false
-- ============================================================
-- Or via SQL:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('screenshots', 'screenshots', false)
-- ON CONFLICT (id) DO NOTHING;

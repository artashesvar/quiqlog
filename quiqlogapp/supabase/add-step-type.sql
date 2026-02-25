-- Migration: add type column to steps table
-- Supports 'step' (default), 'tip', and 'alert' block types

ALTER TABLE steps
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'step'
    CHECK (type IN ('step', 'tip', 'alert'));

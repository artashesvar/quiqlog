-- Add zoom and pan fields to steps table for screenshot zoom/pan feature
ALTER TABLE steps ADD COLUMN IF NOT EXISTS zoom_level FLOAT NOT NULL DEFAULT 1;
ALTER TABLE steps ADD COLUMN IF NOT EXISTS pan_x FLOAT NOT NULL DEFAULT 0;
ALTER TABLE steps ADD COLUMN IF NOT EXISTS pan_y FLOAT NOT NULL DEFAULT 0;

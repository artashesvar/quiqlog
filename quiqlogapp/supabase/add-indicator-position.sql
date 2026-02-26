-- Add indicator position fields to steps table for drag-to-reposition click indicator feature.
-- These store the custom X/Y position as percentages (0–100) of the screenshot dimensions.
-- NULL means no custom position has been set — fall back to the original captured position.
ALTER TABLE steps ADD COLUMN IF NOT EXISTS indicator_x FLOAT;
ALTER TABLE steps ADD COLUMN IF NOT EXISTS indicator_y FLOAT;

-- Production Storage Setup: screenshots bucket
-- Run this in the production Supabase SQL editor (Dashboard > SQL Editor > New query)
-- Safe to run multiple times (idempotent)

-- 1. Create the screenshots bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'screenshots',
  'screenshots',
  false,
  5242880,  -- 5MB limit, matching the extension upload route
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS policies
-- Drop first so this script is safe to re-run if policies already exist

DROP POLICY IF EXISTS "storage_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "storage_select_own" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_own" ON storage.objects;

-- Users can upload their own screenshots
-- Path format: {userId}/{guideId}/{filename}.png  or  {userId}/pending/{sessionId}/{filename}.png
CREATE POLICY "storage_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own screenshots
CREATE POLICY "storage_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own screenshots
CREATE POLICY "storage_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Verify the bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'screenshots';

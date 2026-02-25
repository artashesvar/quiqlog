-- Quiqlog Storage Policies
-- Run AFTER creating the 'screenshots' bucket in Supabase Storage

-- Users can upload their own screenshots
-- Path format: {userId}/{guideId}/{filename}.png
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

-- Allow public access to screenshots referenced by public guides
-- Note: We use signed URLs instead of public bucket to keep storage private
-- and serve screenshots via signed URLs generated server-side.
-- If you prefer a simpler setup, make the bucket public and remove these policies.

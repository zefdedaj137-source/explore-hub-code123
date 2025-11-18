-- =====================================================
-- SETUP VOICE MESSAGES STORAGE BUCKET
-- Run this in Supabase SQL Editor
-- =====================================================

-- Note: You need to create the storage bucket manually in Supabase Dashboard
-- Go to Storage → Create a new bucket named "voice-messages"
-- Make it PUBLIC so users can access voice messages

-- After creating the bucket, run these policies:

-- Policy 1: Users can upload their own voice messages
CREATE POLICY "Users can upload voice messages"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'voice-messages' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Users can read voice messages from their matches
CREATE POLICY "Users can read voice messages"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'voice-messages'
);

-- Policy 3: Users can delete their own voice messages
CREATE POLICY "Users can delete own voice messages"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'voice-messages'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Verify policies
SELECT 
  policyname,
  'CREATED ✓' as status
FROM pg_policies 
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%voice%'
ORDER BY policyname;

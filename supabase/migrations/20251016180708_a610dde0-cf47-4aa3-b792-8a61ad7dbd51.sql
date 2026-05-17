-- ============================================
-- Security Fix: Storage Exposure and Dancing Channel Privacy
-- ============================================

-- 1. Secure storage buckets: Make them private
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('profile-photos', 'dance-videos');

-- 2. Drop existing overly permissive storage policies
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view dance videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own dance videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own dance videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own dance videos" ON storage.objects;

-- 3. Create restrictive RLS policies for profile-photos bucket
-- Only authenticated users can view profile photos
DROP POLICY IF EXISTS "Authenticated users can view profile photos" ON storage;
DROP POLICY IF EXISTS "Authenticated users can view profile photos" ON storage;
CREATE POLICY "Authenticated users can view profile photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'profile-photos' AND
  auth.role() = 'authenticated'
);

-- Users can upload to their own folder
DROP POLICY IF EXISTS "Users can upload own profile photos" ON storage;
DROP POLICY IF EXISTS "Users can upload own profile photos" ON storage;
CREATE POLICY "Users can upload own profile photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own photos
DROP POLICY IF EXISTS "Users can update own profile photos" ON storage;
DROP POLICY IF EXISTS "Users can update own profile photos" ON storage;
CREATE POLICY "Users can update own profile photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own photos
DROP POLICY IF EXISTS "Users can delete own profile photos" ON storage;
DROP POLICY IF EXISTS "Users can delete own profile photos" ON storage;
CREATE POLICY "Users can delete own profile photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Create restrictive RLS policies for dance-videos bucket
-- Only dancing channel participants can view videos
DROP POLICY IF EXISTS "Channel participants view dance videos" ON storage;
DROP POLICY IF EXISTS "Channel participants view dance videos" ON storage;
CREATE POLICY "Channel participants view dance videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'dance-videos' AND
  EXISTS (
    SELECT 1 FROM dancing_channel_participants
    WHERE user_id = auth.uid()
  )
);

-- Users can upload videos to their own folder if they're participants
DROP POLICY IF EXISTS "Participants upload own dance videos" ON storage;
DROP POLICY IF EXISTS "Participants upload own dance videos" ON storage;
CREATE POLICY "Participants upload own dance videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'dance-videos' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM dancing_channel_participants
    WHERE user_id = auth.uid()
  )
);

-- Users can update their own videos
DROP POLICY IF EXISTS "Users update own dance videos" ON storage;
DROP POLICY IF EXISTS "Users update own dance videos" ON storage;
CREATE POLICY "Users update own dance videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'dance-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own videos
DROP POLICY IF EXISTS "Users delete own dance videos" ON storage;
DROP POLICY IF EXISTS "Users delete own dance videos" ON storage;
CREATE POLICY "Users delete own dance videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'dance-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Fix dancing_channel_participants RLS policy
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view dancing channel participants" ON dancing_channel_participants;

-- Create a restrictive policy: only participants can see the participant list
DROP POLICY IF EXISTS "Participants view participant list" ON dancing_channel_participants;
DROP POLICY IF EXISTS "Participants view participant list" ON dancing_channel_participants;
CREATE POLICY "Participants view participant list"
ON dancing_channel_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM dancing_channel_participants dcp
    WHERE dcp.user_id = auth.uid()
  )
);
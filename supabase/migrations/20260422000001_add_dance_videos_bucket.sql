-- Description: Create dance-videos storage bucket for Dance Challenge game
-- Created: 2026-04-22

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dance-videos',
  'dance-videos',
  false,
  52428800, -- 50 MB per video
  ARRAY['video/webm', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload dance videos
DROP POLICY IF EXISTS "Authenticated users can upload dance videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload dance videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'dance-videos');

-- Allow authenticated users to read dance videos (needed for signed URL generation)
DROP POLICY IF EXISTS "Authenticated users can read dance videos" ON storage.objects;
CREATE POLICY "Authenticated users can read dance videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'dance-videos');

-- Allow users to delete their own dance videos
DROP POLICY IF EXISTS "Users can delete own dance videos" ON storage.objects;
CREATE POLICY "Users can delete own dance videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'dance-videos' AND auth.uid()::text = (storage.foldername(name))[2]);

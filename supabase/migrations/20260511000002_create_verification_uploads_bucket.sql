-- Create the storage bucket for verification uploads (selfies + ID photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-uploads',
  'verification-uploads',
  false, -- private: only accessible via signed URLs or service role
  10485760, -- 10 MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own verification files
DROP POLICY IF EXISTS "Users can upload own verification files" ON storage.objects;
CREATE POLICY "Users can upload own verification files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to read their own verification files
DROP POLICY IF EXISTS "Users can read own verification files" ON storage.objects;
CREATE POLICY "Users can read own verification files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow service_role (admin) to read all verification files for review
DROP POLICY IF EXISTS "Service role can read all verification files" ON storage.objects;
CREATE POLICY "Service role can read all verification files"
  ON storage.objects FOR SELECT
  TO service_role
  USING (bucket_id = 'verification-uploads');

-- Add image_url column to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_url text;

-- Create chat-images storage bucket (public so images can be viewed)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload chat images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view chat images (public bucket)
CREATE POLICY "Chat images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-images');

-- Allow users to delete their own chat images  
CREATE POLICY "Users can delete own chat images"
ON storage.objects FOR DELETE
);

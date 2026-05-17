-- Create dancing_videos table
CREATE TABLE public.dancing_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  song_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  average_rating NUMERIC(3,1) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0
);

-- Create video_ratings table
CREATE TABLE public.video_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.dancing_videos(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(video_id, rater_id)
);

-- Enable RLS
ALTER TABLE public.dancing_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dancing_videos
DROP POLICY IF EXISTS "Anyone can view dancing videos" ON public;
DROP POLICY IF EXISTS "Anyone can view dancing videos" ON public;
CREATE POLICY "Anyone can view dancing videos"
  ON public.dancing_videos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own videos" ON public;
DROP POLICY IF EXISTS "Users can insert their own videos" ON public;
CREATE POLICY "Users can insert their own videos"
  ON public.dancing_videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own videos" ON public;
DROP POLICY IF EXISTS "Users can update their own videos" ON public;
CREATE POLICY "Users can update their own videos"
  ON public.dancing_videos FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own videos" ON public;
DROP POLICY IF EXISTS "Users can delete their own videos" ON public;
CREATE POLICY "Users can delete their own videos"
  ON public.dancing_videos FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for video_ratings
DROP POLICY IF EXISTS "Anyone can view ratings" ON public;
DROP POLICY IF EXISTS "Anyone can view ratings" ON public;
CREATE POLICY "Anyone can view ratings"
  ON public.video_ratings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own ratings" ON public;
DROP POLICY IF EXISTS "Users can insert their own ratings" ON public;
CREATE POLICY "Users can insert their own ratings"
  ON public.video_ratings FOR INSERT
  WITH CHECK (auth.uid() = rater_id);

DROP POLICY IF EXISTS "Users can update their own ratings" ON public;
DROP POLICY IF EXISTS "Users can update their own ratings" ON public;
CREATE POLICY "Users can update their own ratings"
  ON public.video_ratings FOR UPDATE
  USING (auth.uid() = rater_id);

DROP POLICY IF EXISTS "Users can delete their own ratings" ON public;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON public;
CREATE POLICY "Users can delete their own ratings"
  ON public.video_ratings FOR DELETE
  USING (auth.uid() = rater_id);

-- Create storage bucket for dance videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dance-videos',
  'dance-videos',
  true,
  52428800, -- 50MB limit
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
);

-- Storage policies for dance videos
DROP POLICY IF EXISTS "Anyone can view dance videos" ON storage;
DROP POLICY IF EXISTS "Anyone can view dance videos" ON storage;
CREATE POLICY "Anyone can view dance videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dance-videos');

DROP POLICY IF EXISTS "Users can upload their own dance videos" ON storage;
DROP POLICY IF EXISTS "Users can upload their own dance videos" ON storage;
CREATE POLICY "Users can upload their own dance videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dance-videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own dance videos" ON storage;
DROP POLICY IF EXISTS "Users can update their own dance videos" ON storage;
CREATE POLICY "Users can update their own dance videos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'dance-videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own dance videos" ON storage;
DROP POLICY IF EXISTS "Users can delete their own dance videos" ON storage;
CREATE POLICY "Users can delete their own dance videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'dance-videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to update average rating
CREATE OR REPLACE FUNCTION update_video_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE dancing_videos
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM video_ratings
      WHERE video_id = NEW.video_id
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM video_ratings
      WHERE video_id = NEW.video_id
    )
  WHERE id = NEW.video_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to update ratings
CREATE TRIGGER update_video_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON video_ratings
FOR EACH ROW
EXECUTE FUNCTION update_video_rating();
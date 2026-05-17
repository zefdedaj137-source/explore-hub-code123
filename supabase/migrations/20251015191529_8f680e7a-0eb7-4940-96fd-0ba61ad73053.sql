-- Create table to track users who joined the dancing channel
CREATE TABLE public.dancing_channel_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on dancing_channel_participants
ALTER TABLE public.dancing_channel_participants ENABLE ROW LEVEL SECURITY;

-- Users can view all participants
DROP POLICY IF EXISTS "Anyone can view dancing channel participants" ON public;
DROP POLICY IF EXISTS "Anyone can view dancing channel participants" ON public;
CREATE POLICY "Anyone can view dancing channel participants"
ON public.dancing_channel_participants
FOR SELECT
TO authenticated
USING (true);

-- Users can join the channel
DROP POLICY IF EXISTS "Users can join dancing channel" ON public;
DROP POLICY IF EXISTS "Users can join dancing channel" ON public;
CREATE POLICY "Users can join dancing channel"
ON public.dancing_channel_participants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can leave the channel
DROP POLICY IF EXISTS "Users can leave dancing channel" ON public;
DROP POLICY IF EXISTS "Users can leave dancing channel" ON public;
CREATE POLICY "Users can leave dancing channel"
ON public.dancing_channel_participants
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Update dancing_videos RLS to only show videos to channel participants
DROP POLICY IF EXISTS "Anyone can view dancing videos" ON public.dancing_videos;

DROP POLICY IF EXISTS "Channel participants can view dancing videos" ON public;
DROP POLICY IF EXISTS "Channel participants can view dancing videos" ON public;
CREATE POLICY "Channel participants can view dancing videos"
ON public.dancing_videos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dancing_channel_participants
    WHERE user_id = auth.uid()
  )
);

-- Function to create match when rating is above 5
CREATE OR REPLACE FUNCTION public.check_dancing_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  video_owner_id uuid;
BEGIN
  -- Only proceed if rating is above 5
  IF NEW.rating > 5 THEN
    -- Get the owner of the rated video
    SELECT user_id INTO video_owner_id
    FROM public.dancing_videos
    WHERE id = NEW.video_id;

    -- Create a match between the rater and video owner
    INSERT INTO public.matches (user1_id, user2_id)
    VALUES (
      LEAST(NEW.rater_id, video_owner_id),
      GREATEST(NEW.rater_id, video_owner_id)
    )
    ON CONFLICT (user1_id, user2_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to check for matches on ratings
CREATE TRIGGER check_dancing_match_trigger
AFTER INSERT OR UPDATE ON public.video_ratings
FOR EACH ROW
EXECUTE FUNCTION public.check_dancing_match();
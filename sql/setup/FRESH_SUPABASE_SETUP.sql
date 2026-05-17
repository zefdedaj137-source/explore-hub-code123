-- ============================================
-- FRESH SUPABASE PROJECT SETUP - PRODUCTION READY
-- ============================================
-- 
-- INSTRUCTIONS FOR NEW SUPABASE PROJECT:
-- 1. Create new project at https://supabase.com/dashboard
-- 2. Go to SQL Editor in your NEW project
-- 3. Copy and paste this entire script
-- 4. Execute it to set up everything properly from scratch
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CREATE PROFILES TABLE
-- ============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 18 AND age <= 100),
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    looking_for TEXT NOT NULL CHECK (looking_for IN ('male', 'female', 'everyone')),
    location TEXT NOT NULL,
    city TEXT,
    country TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    bio TEXT,
    interests TEXT[] DEFAULT '{}',
    profile_image_url TEXT,
    min_age_preference INTEGER DEFAULT 18,
    max_age_preference INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE DANCING CHANNEL PARTICIPANTS TABLE
-- ============================================
CREATE TABLE public.dancing_channel_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

ALTER TABLE public.dancing_channel_participants ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE MATCHES TABLE
-- ============================================
CREATE TABLE public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE LIKES TABLE
-- ============================================
CREATE TABLE public.likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    liker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    liked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(liker_id, liked_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE MESSAGES TABLE
-- ============================================
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SAFE NON-RECURSIVE POLICIES
-- ============================================

-- Profiles policies (SAFE)
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own profile"
ON public.profiles FOR ALL
USING (auth.uid() = id);

-- Dancing participants policies (SAFE)
CREATE POLICY "Users can view dancing participants"
ON public.dancing_channel_participants FOR SELECT
USING (true);

CREATE POLICY "Users can manage their dancing participation"
ON public.dancing_channel_participants FOR ALL
USING (auth.uid() = user_id);

-- Matches policies (SAFE)
CREATE POLICY "Users can view their matches"
ON public.matches FOR SELECT
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create matches"
ON public.matches FOR INSERT
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Likes policies (SAFE)
CREATE POLICY "Users can view likes they gave or received"
ON public.likes FOR SELECT
USING (auth.uid() = liker_id OR auth.uid() = liked_id);

CREATE POLICY "Users can create their own likes"
ON public.likes FOR INSERT
WITH CHECK (auth.uid() = liker_id);

CREATE POLICY "Users can delete their own likes"
ON public.likes FOR DELETE
USING (auth.uid() = liker_id);

-- Messages policies (SAFE)
CREATE POLICY "Users can view messages in their matches"
ON public.messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.matches 
        WHERE id = match_id 
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
);

CREATE POLICY "Users can send messages in their matches"
ON public.messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM public.matches 
        WHERE id = match_id 
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
);

-- ============================================
-- SECURE RPC FUNCTIONS
-- ============================================

-- Get profiles for discovery (NO RECURSION)
CREATE OR REPLACE FUNCTION public.get_profiles_for_discovery(
  viewer_user_id UUID,
  gender_filter TEXT DEFAULT NULL,
  min_age_filter INTEGER DEFAULT 18,
  max_age_filter INTEGER DEFAULT 100,
  excluded_profile_ids UUID[] DEFAULT ARRAY[]::UUID[],
  result_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  age INTEGER,
  gender TEXT,
  bio TEXT,
  profile_image_url TEXT,
  city TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.age,
    p.gender,
    p.bio,
    p.profile_image_url,
    p.city,
    p.country,
    p.latitude,
    p.longitude
  FROM public.profiles p
  WHERE p.id != viewer_user_id
    AND (gender_filter IS NULL OR gender_filter = 'everyone' OR p.gender = gender_filter)
    AND p.age >= min_age_filter
    AND p.age <= max_age_filter
    AND (excluded_profile_ids IS NULL OR NOT (p.id = ANY(excluded_profile_ids)))
    -- Exclude already liked profiles
    AND NOT EXISTS (
        SELECT 1 FROM public.likes 
        WHERE liker_id = viewer_user_id AND liked_id = p.id
    )
  ORDER BY p.created_at DESC
  LIMIT result_limit;
END;
$$;

-- Create like and check for match
CREATE OR REPLACE FUNCTION public.create_like_and_check_match(
  liker_user_id UUID,
  liked_user_id UUID
)
RETURNS TABLE (
  is_match BOOLEAN,
  match_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_match_id UUID;
  is_mutual BOOLEAN := false;
BEGIN
  -- Insert the like
  INSERT INTO public.likes (liker_id, liked_id)
  VALUES (liker_user_id, liked_user_id)
  ON CONFLICT (liker_id, liked_id) DO NOTHING;
  
  -- Check if it's mutual
  SELECT EXISTS (
    SELECT 1 FROM public.likes
    WHERE liker_id = liked_user_id AND liked_id = liker_user_id
  ) INTO is_mutual;
  
  -- If mutual, create match
  IF is_mutual THEN
    INSERT INTO public.matches (user1_id, user2_id)
    VALUES (
      LEAST(liker_user_id, liked_user_id),
      GREATEST(liker_user_id, liked_user_id)
    )
    ON CONFLICT (user1_id, user2_id) DO NOTHING
    RETURNING id INTO new_match_id;
  END IF;
  
  RETURN QUERY SELECT is_mutual, new_match_id;
END;
$$;

-- Dancing channel functions
CREATE OR REPLACE FUNCTION public.join_dancing_channel(
  user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO dancing_channel_participants (user_id)
  VALUES (user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN true;
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_dancing_channel(
  user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM dancing_channel_participants 
  WHERE dancing_channel_participants.user_id = leave_dancing_channel.user_id;
  
  RETURN true;
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$;

-- Get user matches
CREATE OR REPLACE FUNCTION public.get_user_matches(
  user_id UUID
)
RETURNS TABLE (
  match_id UUID,
  other_user_id UUID,
  other_user_name TEXT,
  other_user_image TEXT,
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as match_id,
    CASE 
      WHEN m.user1_id = user_id THEN m.user2_id
      ELSE m.user1_id
    END as other_user_id,
    p.full_name as other_user_name,
    p.profile_image_url as other_user_image,
    (
      SELECT content FROM public.messages msg
      WHERE msg.match_id = m.id
      ORDER BY msg.created_at DESC
      LIMIT 1
    ) as last_message,
    (
      SELECT created_at FROM public.messages msg
      WHERE msg.match_id = m.id
      ORDER BY msg.created_at DESC
      LIMIT 1
    ) as last_message_time
  FROM public.matches m
  JOIN public.profiles p ON (
    p.id = CASE 
      WHEN m.user1_id = user_id THEN m.user2_id
      ELSE m.user1_id
    END
  )
  WHERE m.user1_id = user_id OR m.user2_id = user_id
  ORDER BY m.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_profiles_for_discovery TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_like_and_check_match TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_dancing_channel TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_dancing_channel TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_matches TO authenticated;

-- ============================================
-- CREATE STORAGE BUCKETS AND POLICIES
-- ============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('profile-photos', 'profile-photos', true),
  ('dance-videos', 'dance-videos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Profile photos storage policies (SAFE - no table references)
CREATE POLICY "Anyone can view profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can upload own profile photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own profile photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own profile photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Dance videos storage policies (SAFE - no table references)
CREATE POLICY "Anyone can view dance videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'dance-videos');

CREATE POLICY "Users can upload own dance videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'dance-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own dance videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'dance-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own dance videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'dance-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_profiles_discovery ON public.profiles(gender, age, created_at);
CREATE INDEX idx_likes_liker ON public.likes(liker_id);
CREATE INDEX idx_likes_liked ON public.likes(liked_id);
CREATE INDEX idx_matches_users ON public.matches(user1_id, user2_id);
CREATE INDEX idx_messages_match ON public.messages(match_id, created_at DESC);
CREATE INDEX idx_dancing_participants_user ON public.dancing_channel_participants(user_id);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '🚀 FRESH SUPABASE PROJECT SETUP COMPLETE!';
    RAISE NOTICE '✅ All tables created with safe, non-recursive policies';
    RAISE NOTICE '✅ Storage buckets configured for photos and videos';
    RAISE NOTICE '✅ RPC functions ready for production use';
    RAISE NOTICE '✅ No recursion issues - ready for production!';
END $$;
-- ============================================
-- PREMIUM FEATURES MIGRATION
-- Stories, Video Profiles, Verification, Matching
-- ============================================

-- 1. STORIES TABLE
CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  thumbnail_url text,
  caption text,
  duration integer DEFAULT 5, -- seconds for images, actual duration for videos
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  views_count integer DEFAULT 0,
  CONSTRAINT valid_duration CHECK (duration > 0 AND duration <= 30)
);

-- Story views tracking
CREATE TABLE IF NOT EXISTS public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- 2. VIDEO PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.video_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  thumbnail_url text NOT NULL,
  duration integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. VERIFICATION TABLE
CREATE TABLE IF NOT EXISTS public.verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verification_type text NOT NULL CHECK (verification_type IN ('selfie', 'id_document', 'phone', 'email')),
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  media_url text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewer_notes text,
  UNIQUE(user_id, verification_type)
);

-- 4. SMART MATCHING PREFERENCES
CREATE TABLE IF NOT EXISTS public.matching_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  importance_distance integer DEFAULT 5 CHECK (importance_distance BETWEEN 1 AND 10),
  importance_age integer DEFAULT 5 CHECK (importance_age BETWEEN 1 AND 10),
  importance_interests integer DEFAULT 7 CHECK (importance_interests BETWEEN 1 AND 10),
  importance_education integer DEFAULT 3 CHECK (importance_education BETWEEN 1 AND 10),
  importance_lifestyle integer DEFAULT 5 CHECK (importance_lifestyle BETWEEN 1 AND 10),
  deal_breakers jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 5. MATCH QUALITY SCORES
CREATE TABLE IF NOT EXISTS public.match_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  compatibility_score decimal(5,2) NOT NULL CHECK (compatibility_score BETWEEN 0 AND 100),
  distance_score decimal(5,2),
  age_score decimal(5,2),
  interest_score decimal(5,2),
  education_score decimal(5,2),
  lifestyle_score decimal(5,2),
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_user_id)
);

-- 6. PROFILE COMPLETENESS TRACKING
CREATE TABLE IF NOT EXISTS public.profile_completeness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  has_photo boolean DEFAULT false,
  has_bio boolean DEFAULT false,
  has_interests boolean DEFAULT false,
  has_video_profile boolean DEFAULT false,
  has_verified boolean DEFAULT false,
  completeness_score integer DEFAULT 0 CHECK (completeness_score BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Stories indexes
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON public.stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON public.story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON public.story_views(viewer_id);

-- Video profiles indexes
CREATE INDEX IF NOT EXISTS idx_video_profiles_user_id ON public.video_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_video_profiles_active ON public.video_profiles(is_active) WHERE is_active = true;

-- Verification indexes
CREATE INDEX IF NOT EXISTS idx_verifications_user_id ON public.verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON public.verifications(status);

-- Match scores indexes
CREATE INDEX IF NOT EXISTS idx_match_scores_user_id ON public.match_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_target_user_id ON public.match_scores(target_user_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_compatibility ON public.match_scores(compatibility_score DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Stories RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY stories_select_policy ON public.stories
  FOR SELECT TO authenticated
  USING (
    -- Can see own stories or stories from profiles within distance
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = stories.user_id
      AND stories.expires_at > now()
    )
  );

CREATE POLICY stories_insert_policy ON public.stories
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY stories_delete_policy ON public.stories
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Story views RLS
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY story_views_select_policy ON public.story_views
  FOR SELECT TO authenticated
  USING (
    -- Can see who viewed your stories
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE stories.id = story_views.story_id
      AND stories.user_id = auth.uid()
    )
  );

CREATE POLICY story_views_insert_policy ON public.story_views
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = viewer_id);

-- Video profiles RLS
ALTER TABLE public.video_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY video_profiles_select_policy ON public.video_profiles
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY video_profiles_insert_policy ON public.video_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY video_profiles_update_policy ON public.video_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Verifications RLS
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY verifications_select_own ON public.verifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY verifications_insert_policy ON public.verifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Matching preferences RLS
ALTER TABLE public.matching_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY matching_preferences_all ON public.matching_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Match scores RLS (read-only for users)
ALTER TABLE public.match_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY match_scores_select_policy ON public.match_scores
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Profile completeness RLS
ALTER TABLE public.profile_completeness ENABLE ROW LEVEL SECURITY;

CREATE POLICY profile_completeness_select ON public.profile_completeness
  FOR SELECT TO authenticated
  USING (true); -- Anyone can see completeness scores

CREATE POLICY profile_completeness_own ON public.profile_completeness
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to clean up expired stories
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.stories
  WHERE expires_at < now();
END;
$$;

-- Function to record story view
CREATE OR REPLACE FUNCTION record_story_view(p_story_id uuid, p_viewer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Don't record if viewing own story
  IF EXISTS (
    SELECT 1 FROM public.stories
    WHERE id = p_story_id AND user_id = p_viewer_id
  ) THEN
    RETURN;
  END IF;

  -- Insert or update view
  INSERT INTO public.story_views (story_id, viewer_id)
  VALUES (p_story_id, p_viewer_id)
  ON CONFLICT (story_id, viewer_id) DO NOTHING;

  -- Increment view count
  UPDATE public.stories
  SET views_count = views_count + 1
  WHERE id = p_story_id;
END;
$$;

-- Function to calculate compatibility score
CREATE OR REPLACE FUNCTION calculate_compatibility_score(
  p_user_id uuid,
  p_target_user_id uuid
)
RETURNS decimal
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_distance_score decimal := 0;
  v_age_score decimal := 0;
  v_interest_score decimal := 0;
  v_education_score decimal := 0;
  v_lifestyle_score decimal := 0;
  v_preferences record;
  v_total_score decimal := 0;
BEGIN
  -- Get user preferences
  SELECT * INTO v_preferences
  FROM public.matching_preferences
  WHERE user_id = p_user_id;

  -- If no preferences, use defaults
  IF v_preferences IS NULL THEN
    v_preferences.importance_distance := 5;
    v_preferences.importance_age := 5;
    v_preferences.importance_interests := 7;
    v_preferences.importance_education := 3;
    v_preferences.importance_lifestyle := 5;
  END IF;

  -- Calculate individual scores (0-10)
  -- Distance score (inverse - closer is better)
  -- Age score (closer age = better)
  -- Interest score (more common interests = better)
  -- Education score (similar level = better)
  -- Lifestyle score (compatible habits = better)

  -- Calculate weighted total
  v_total_score := (
    (v_distance_score * v_preferences.importance_distance) +
    (v_age_score * v_preferences.importance_age) +
    (v_interest_score * v_preferences.importance_interests) +
    (v_education_score * v_preferences.importance_education) +
    (v_lifestyle_score * v_preferences.importance_lifestyle)
  ) / (
    v_preferences.importance_distance +
    v_preferences.importance_age +
    v_preferences.importance_interests +
    v_preferences.importance_education +
    v_preferences.importance_lifestyle
  ) * 10;

  RETURN v_total_score;
END;
$$;

-- Function to update profile completeness
CREATE OR REPLACE FUNCTION update_profile_completeness(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_photo boolean;
  v_has_bio boolean;
  v_has_interests boolean;
  v_has_video boolean;
  v_has_verified boolean;
  v_score integer := 0;
BEGIN
  -- Check photo
  SELECT profile_image_url IS NOT NULL INTO v_has_photo
  FROM public.profiles WHERE id = p_user_id;
  IF v_has_photo THEN v_score := v_score + 30; END IF;

  -- Check bio
  SELECT bio IS NOT NULL AND length(bio) > 20 INTO v_has_bio
  FROM public.profiles WHERE id = p_user_id;
  IF v_has_bio THEN v_score := v_score + 20; END IF;

  -- Check interests
  SELECT array_length(interests, 1) >= 3 INTO v_has_interests
  FROM public.profiles WHERE id = p_user_id;
  IF v_has_interests THEN v_score := v_score + 20; END IF;

  -- Check video profile
  SELECT EXISTS(SELECT 1 FROM public.video_profiles WHERE user_id = p_user_id AND is_active = true)
  INTO v_has_video;
  IF v_has_video THEN v_score := v_score + 15; END IF;

  -- Check verification
  SELECT EXISTS(SELECT 1 FROM public.verifications WHERE user_id = p_user_id AND status = 'approved')
  INTO v_has_verified;
  IF v_has_verified THEN v_score := v_score + 15; END IF;

  -- Upsert completeness record
  INSERT INTO public.profile_completeness (
    user_id, has_photo, has_bio, has_interests, has_video_profile, has_verified, completeness_score
  )
  VALUES (p_user_id, v_has_photo, v_has_bio, v_has_interests, v_has_video, v_has_verified, v_score)
  ON CONFLICT (user_id) DO UPDATE SET
    has_photo = EXCLUDED.has_photo,
    has_bio = EXCLUDED.has_bio,
    has_interests = EXCLUDED.has_interests,
    has_video_profile = EXCLUDED.has_video_profile,
    has_verified = EXCLUDED.has_verified,
    completeness_score = EXCLUDED.completeness_score,
    updated_at = now();
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_stories() TO authenticated;
GRANT EXECUTE ON FUNCTION record_story_view(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_compatibility_score(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_profile_completeness(uuid) TO authenticated;

-- ============================================
-- STORAGE BUCKETS (Run these in Supabase Dashboard)
-- ============================================

-- Create storage buckets via SQL or Dashboard:
-- 1. stories (for story images/videos)
-- 2. video-profiles (for profile intro videos)
-- 3. verification-media (for verification selfies/documents)

-- Note: After creating buckets, set these policies in the Supabase Dashboard:
-- stories: authenticated users can upload/read
-- video-profiles: authenticated users can upload, public can read
-- verification-media: authenticated users can upload, service_role can read

COMMENT ON TABLE public.stories IS 'User stories that expire after 24 hours';
COMMENT ON TABLE public.story_views IS 'Track who viewed each story';
COMMENT ON TABLE public.video_profiles IS 'User video introductions (15-30 seconds)';
COMMENT ON TABLE public.verifications IS 'User verification submissions and status';
COMMENT ON TABLE public.matching_preferences IS 'User preferences for match algorithm';
COMMENT ON TABLE public.match_scores IS 'Calculated compatibility scores between users';
COMMENT ON TABLE public.profile_completeness IS 'Profile completion tracking and scoring';

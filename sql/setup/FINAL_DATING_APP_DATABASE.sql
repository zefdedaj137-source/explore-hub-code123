-- COMPLETE DATING APP DATABASE SETUP
-- This will create a fully working dating app database
-- Run this ONCE in your Supabase SQL Editor

-- 1. DROP ALL EXISTING PROBLEMATIC TABLES AND FUNCTIONS
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS daily_swipes CASCADE;
DROP FUNCTION IF EXISTS create_like_and_check_match CASCADE;
DROP FUNCTION IF EXISTS remove_match CASCADE;
DROP FUNCTION IF EXISTS get_remaining_swipes CASCADE;

-- 2. CREATE DAILY SWIPES TABLE
CREATE TABLE daily_swipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  swipe_count INT DEFAULT 0,
  last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for performance
CREATE INDEX idx_daily_swipes_user ON daily_swipes(user_id);

-- Enable RLS
ALTER TABLE daily_swipes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can see their own swipe count" ON daily_swipes 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage swipes" ON daily_swipes 
FOR ALL USING (true);

-- 3. CREATE CLEAN LIKES TABLE
CREATE TABLE likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  liker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  liked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(liker_id, liked_id)
);

-- 3. CREATE CLEAN MATCHES TABLE  
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- 4. CREATE SUBSCRIPTIONS TABLE (for premium features)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  status TEXT NOT NULL DEFAULT 'inactive',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Enable RLS for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for subscriptions
CREATE POLICY "Users can view their own subscription" ON subscriptions 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" ON subscriptions 
FOR ALL USING (true);

-- 5. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX idx_likes_liker ON likes(liker_id);
CREATE INDEX idx_likes_liked ON likes(liked_id);
CREATE INDEX idx_matches_user1 ON matches(user1_id);
CREATE INDEX idx_matches_user2 ON matches(user2_id);

-- 6. ENABLE SECURITY
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- 7. CREATE SIMPLE SECURITY POLICIES
CREATE POLICY "Anyone can read likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can like others" ON likes FOR INSERT WITH CHECK (auth.uid() = liker_id);
CREATE POLICY "Users can unlike" ON likes FOR DELETE USING (auth.uid() = liker_id);

CREATE POLICY "Users can see their matches" ON matches 
FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "System can create matches" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete their matches" ON matches 
FOR DELETE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 8. CREATE GET REMAINING SWIPES FUNCTION
CREATE OR REPLACE FUNCTION get_remaining_swipes(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  swipe_record RECORD;
  is_premium BOOLEAN;
  remaining INT;
  minutes_left INT;
BEGIN
  -- Check if user is premium
  SELECT EXISTS(
    SELECT 1 FROM subscriptions 
    WHERE subscriptions.user_id = get_remaining_swipes.user_id 
    AND status = 'active'
  ) INTO is_premium;

  -- Premium users have unlimited swipes
  IF is_premium THEN
    RETURN json_build_object(
      'remaining_swipes', 999,
      'minutes_until_reset', 0,
      'is_premium', true
    );
  END IF;

  -- Get or create swipe record for non-premium users
  SELECT * INTO swipe_record FROM daily_swipes 
  WHERE daily_swipes.user_id = get_remaining_swipes.user_id;

  IF swipe_record IS NULL THEN
    INSERT INTO daily_swipes (user_id, swipe_count, last_reset)
    VALUES (get_remaining_swipes.user_id, 0, NOW())
    RETURNING * INTO swipe_record;
  END IF;

  -- Check if 24 hours have passed since last reset
  IF (NOW() - swipe_record.last_reset) >= INTERVAL '24 hours' THEN
    -- Reset the counter
    UPDATE daily_swipes 
    SET swipe_count = 0, last_reset = NOW()
    WHERE daily_swipes.user_id = get_remaining_swipes.user_id
    RETURNING * INTO swipe_record;
  END IF;

  -- Calculate remaining swipes
  remaining := GREATEST(0, 10 - swipe_record.swipe_count);
  
  -- Calculate minutes until reset
  minutes_left := EXTRACT(EPOCH FROM (swipe_record.last_reset + INTERVAL '24 hours' - NOW())) / 60;

  RETURN json_build_object(
    'remaining_swipes', remaining,
    'minutes_until_reset', GREATEST(0, minutes_left),
    'is_premium', false
  );
END;
$$;

-- 9. CREATE LIKE FUNCTION (HANDLES LIKE + AUTO-MATCH + SWIPE LIMITS)
CREATE OR REPLACE FUNCTION like_user(
  current_user_id UUID,
  target_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  like_exists BOOLEAN;
  reverse_like_exists BOOLEAN;
  match_id UUID;
  swipe_info JSON;
  is_premium BOOLEAN;
  remaining_swipes INT;
  result JSON;
BEGIN
  -- Validate input
  IF current_user_id = target_user_id THEN
    RAISE EXCEPTION 'Cannot like yourself';
  END IF;
  
  -- Get swipe limit information
  swipe_info := get_remaining_swipes(current_user_id);
  is_premium := (swipe_info->>'is_premium')::BOOLEAN;
  remaining_swipes := (swipe_info->>'remaining_swipes')::INT;

  -- Check swipe limits for non-premium users
  IF NOT is_premium AND remaining_swipes <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Out of swipes! Upgrade to premium for unlimited swipes.',
      'remaining_swipes', 0,
      'minutes_until_reset', (swipe_info->>'minutes_until_reset')::INT,
      'is_premium', false,
      'is_match', false
    );
  END IF;

  -- Check if like already exists
  SELECT EXISTS(
    SELECT 1 FROM likes 
    WHERE liker_id = current_user_id AND liked_id = target_user_id
  ) INTO like_exists;
  
  -- If like doesn't exist, create it
  IF NOT like_exists THEN
    INSERT INTO likes (liker_id, liked_id) 
    VALUES (current_user_id, target_user_id);
    
    -- Increment swipe count for non-premium users
    IF NOT is_premium THEN
      INSERT INTO daily_swipes (user_id, swipe_count, last_reset)
      VALUES (current_user_id, 1, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET swipe_count = daily_swipes.swipe_count + 1;
      
      remaining_swipes := remaining_swipes - 1;
    END IF;
  END IF;
  
  -- Check if target user also likes current user (mutual like = match)
  SELECT EXISTS(
    SELECT 1 FROM likes 
    WHERE liker_id = target_user_id AND liked_id = current_user_id
  ) INTO reverse_like_exists;
  
  -- If mutual like exists, create match
  IF reverse_like_exists THEN
    -- Ensure consistent ordering (smaller UUID first)
    INSERT INTO matches (user1_id, user2_id)
    VALUES (
      LEAST(current_user_id, target_user_id),
      GREATEST(current_user_id, target_user_id)
    )
    ON CONFLICT (user1_id, user2_id) DO NOTHING
    RETURNING id INTO match_id;
    
    -- If match already existed, get its ID
    IF match_id IS NULL THEN
      SELECT id INTO match_id FROM matches 
      WHERE user1_id = LEAST(current_user_id, target_user_id)
      AND user2_id = GREATEST(current_user_id, target_user_id);
    END IF;
    
    result := json_build_object(
      'success', true,
      'is_match', true,
      'match_id', match_id,
      'remaining_swipes', remaining_swipes,
      'minutes_until_reset', (swipe_info->>'minutes_until_reset')::INT,
      'is_premium', is_premium
    );
  ELSE
    result := json_build_object(
      'success', true,
      'is_match', false,
      'match_id', null,
      'remaining_swipes', remaining_swipes,
      'minutes_until_reset', (swipe_info->>'minutes_until_reset')::INT,
      'is_premium', is_premium
    );
  END IF;
  
  RETURN result;
END;
$$;

-- 10. CREATE UNMATCH FUNCTION
CREATE OR REPLACE FUNCTION unmatch_user(
  current_user_id UUID,
  other_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  match_deleted BOOLEAN := false;
BEGIN
  -- Delete the match
  DELETE FROM matches 
  WHERE (user1_id = LEAST(current_user_id, other_user_id) 
         AND user2_id = GREATEST(current_user_id, other_user_id));
  
  match_deleted := FOUND;
  
  -- Delete both likes (clean slate)
  DELETE FROM likes 
  WHERE (liker_id = current_user_id AND liked_id = other_user_id)
     OR (liker_id = other_user_id AND liked_id = current_user_id);
  
  RETURN json_build_object(
    'success', match_deleted,
    'message', CASE WHEN match_deleted THEN 'Unmatched successfully' ELSE 'No match found' END
  );
END;
$$;

-- 11. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION like_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unmatch_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_remaining_swipes(UUID) TO authenticated;

-- 12. SUCCESS MESSAGE
DO $$
BEGIN
  RAISE NOTICE '✅ Dating app database setup complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - Tables: likes, matches, daily_swipes, subscriptions';
  RAISE NOTICE '  - Functions: like_user, unmatch_user, get_remaining_swipes';
  RAISE NOTICE '  - RLS Policies for security';
  RAISE NOTICE '';
  RAISE NOTICE 'Features enabled:';
  RAISE NOTICE '  - 10 free swipes per 24 hours';
  RAISE NOTICE '  - Unlimited swipes for premium users';
  RAISE NOTICE '  - Automatic match creation';
  RAISE NOTICE '  - Swipe counter with reset timer';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Run VERIFY_DATABASE.sql to confirm setup';
END $$;
-- Idempotency table for Stripe superlike purchase fulfillment
CREATE TABLE IF NOT EXISTS superlike_fulfillments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE superlike_fulfillments ENABLE ROW LEVEL SECURITY;
-- Only service role can insert/select (fulfilled by edge function with service role key)

-- Add is_superlike flag to likes table
ALTER TABLE likes
  ADD COLUMN IF NOT EXISTS is_superlike BOOLEAN NOT NULL DEFAULT FALSE;

-- Update like_user function to accept optional is_superlike parameter
CREATE OR REPLACE FUNCTION like_user(
  current_user_id UUID,
  target_user_id UUID,
  p_is_superlike BOOLEAN DEFAULT FALSE
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
    INSERT INTO likes (liker_id, liked_id, is_superlike)
    VALUES (current_user_id, target_user_id, p_is_superlike);

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

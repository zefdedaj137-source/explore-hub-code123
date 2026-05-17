-- Add streak tracking columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_last_active_date DATE,
ADD COLUMN IF NOT EXISTS streak_free_likes_credits INTEGER DEFAULT 0;

-- Function to update daily streak (call on app open / page load)
CREATE OR REPLACE FUNCTION update_daily_streak(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_last_date DATE;
  v_today DATE := CURRENT_DATE;
  v_streak INTEGER;
  v_credits INTEGER;
  v_reward_earned BOOLEAN := FALSE;
BEGIN
  SELECT streak_count, streak_last_active_date, streak_free_likes_credits
  INTO v_streak, v_last_date, v_credits
  FROM profiles
  WHERE id = p_user_id;

  -- Already checked in today
  IF v_last_date = v_today THEN
    RETURN json_build_object(
      'streak_count', v_streak,
      'streak_free_likes_credits', v_credits,
      'reward_earned', FALSE,
      'already_checked_in', TRUE
    );
  END IF;

  -- Consecutive day (yesterday)
  IF v_last_date = v_today - INTERVAL '1 day' THEN
    v_streak := COALESCE(v_streak, 0) + 1;
  ELSE
    -- Streak broken, reset to 1
    v_streak := 1;
  END IF;

  -- Every 7 days of streak, grant 2 free likes credits and reset streak
  IF v_streak >= 7 THEN
    v_credits := COALESCE(v_credits, 0) + 2;
    v_reward_earned := TRUE;
    v_streak := 0;
  END IF;

  UPDATE profiles
  SET streak_count = v_streak,
      streak_last_active_date = v_today,
      streak_free_likes_credits = v_credits
  WHERE id = p_user_id;

  RETURN json_build_object(
    'streak_count', v_streak,
    'streak_free_likes_credits', v_credits,
    'reward_earned', v_reward_earned,
    'already_checked_in', FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to use a free likes credit (reveals one like)
CREATE OR REPLACE FUNCTION use_streak_like_credit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_credits INTEGER;
BEGIN
  SELECT streak_free_likes_credits INTO v_credits
  FROM profiles
  WHERE id = p_user_id;

  IF COALESCE(v_credits, 0) <= 0 THEN
    RETURN json_build_object('success', FALSE, 'error', 'No free likes credits remaining');
  END IF;

  UPDATE profiles
  SET streak_free_likes_credits = streak_free_likes_credits - 1
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', TRUE,
    'credits_remaining', v_credits - 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_daily_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION use_streak_like_credit(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

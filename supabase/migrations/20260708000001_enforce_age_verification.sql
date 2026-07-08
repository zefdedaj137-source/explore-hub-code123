-- Migration: Add age-verification enforcement for App Store compliance
-- Purpose: Defense-in-depth so under-18 users cannot use dating features.
--
-- NOTE: The primary guarantee is the CHECK constraint added in
-- 20260708000000_add_age_verification.sql (no profile row may have age < 18).
-- This migration adds an application-level age guard to the existing
-- like_user() and superlike_user() RPCs *without changing any of their other
-- behaviour*. The full original function bodies are preserved verbatim; only a
-- short age check has been prepended.

-- ---------------------------------------------------------------------------
-- Helper: returns TRUE only when the profile exists and is 18 or older.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_user_18_plus(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dob DATE;
BEGIN
  SELECT date_of_birth INTO v_dob FROM public.profiles WHERE id = p_user_id;
  IF v_dob IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXTRACT(YEAR FROM age(CURRENT_DATE, v_dob)) >= 18;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_user_18_plus(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- like_user(current_user_id, target_user_id) — age guard + original logic
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION like_user(current_user_id UUID, target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_premium          BOOLEAN;
  v_swipe_count         INT;
  v_last_reset          TIMESTAMPTZ;
  v_remaining           INT;
  v_minutes_until_reset FLOAT;
  v_daily_limit         INT := 15;
  v_is_match            BOOLEAN := false;
  v_mutual_exists       BOOLEAN;
BEGIN
  -- Prevent self-like
  IF current_user_id = target_user_id THEN
    RETURN json_build_object(
      'success', false, 'error', 'Cannot like yourself',
      'remaining_swipes', 0, 'minutes_until_reset', 0,
      'is_premium', false, 'is_match', false
    );
  END IF;

  -- AGE GATE (App Store compliance): both parties must be 18+
  IF NOT public.is_user_18_plus(current_user_id) THEN
    RETURN json_build_object(
      'success', false, 'error', 'You must be 18 or older to use dating features',
      'remaining_swipes', 0, 'minutes_until_reset', 0,
      'is_premium', false, 'is_match', false
    );
  END IF;

  IF NOT public.is_user_18_plus(target_user_id) THEN
    RETURN json_build_object(
      'success', false, 'error', 'Cannot interact with profiles of users under 18',
      'remaining_swipes', 0, 'minutes_until_reset', 0,
      'is_premium', false, 'is_match', false
    );
  END IF;

  -- Check premium status
  SELECT COALESCE(is_premium, false)
    INTO v_is_premium
    FROM profiles
   WHERE id = current_user_id;

  -- Enforce daily swipe limit for free users
  IF NOT v_is_premium THEN
    SELECT swipe_count, last_reset
      INTO v_swipe_count, v_last_reset
      FROM daily_swipes
     WHERE user_id = current_user_id;

    IF v_last_reset IS NULL
       OR DATE_TRUNC('day', v_last_reset AT TIME ZONE 'UTC')
          < DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC')
    THEN
      v_swipe_count := 0;
    END IF;

    IF COALESCE(v_swipe_count, 0) >= v_daily_limit THEN
      RETURN json_build_object(
        'success', false, 'error', 'Daily swipe limit reached',
        'remaining_swipes', 0,
        'minutes_until_reset',
          EXTRACT(EPOCH FROM (
            DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC' + INTERVAL '1 day') - NOW()
          )) / 60.0,
        'is_premium', false, 'is_match', false
      );
    END IF;
  END IF;

  -- Record the like (upsert so re-liking after a pass works)
  INSERT INTO likes (liker_id, liked_id, action)
  VALUES (current_user_id, target_user_id, 'like')
  ON CONFLICT (liker_id, liked_id)
    DO UPDATE SET action = 'like';

  -- Check for mutual like → match
  SELECT EXISTS (
    SELECT 1 FROM likes
     WHERE liker_id = target_user_id
       AND liked_id  = current_user_id
       AND action    = 'like'
  ) INTO v_mutual_exists;

  IF v_mutual_exists THEN
    v_is_match := true;
    INSERT INTO matches (user1_id, user2_id)
    VALUES (
      LEAST(current_user_id, target_user_id),
      GREATEST(current_user_id, target_user_id)
    )
    ON CONFLICT (user1_id, user2_id) DO NOTHING;
  END IF;

  -- Increment daily swipe counter for free users
  IF NOT v_is_premium THEN
    INSERT INTO daily_swipes (user_id, swipe_count, last_reset)
    VALUES (current_user_id, 1, NOW())
    ON CONFLICT (user_id) DO UPDATE
      SET swipe_count =
            CASE
              WHEN DATE_TRUNC('day', daily_swipes.last_reset AT TIME ZONE 'UTC')
                   < DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC')
              THEN 1
              ELSE daily_swipes.swipe_count + 1
            END,
          last_reset =
            CASE
              WHEN DATE_TRUNC('day', daily_swipes.last_reset AT TIME ZONE 'UTC')
                   < DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC')
              THEN NOW()
              ELSE daily_swipes.last_reset
            END;

    SELECT swipe_count INTO v_swipe_count
      FROM daily_swipes
     WHERE user_id = current_user_id;

    v_remaining           := GREATEST(0, v_daily_limit - COALESCE(v_swipe_count, 0));
    v_minutes_until_reset :=
      EXTRACT(EPOCH FROM (
        DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC' + INTERVAL '1 day') - NOW()
      )) / 60.0;
  ELSE
    v_remaining           := 999;
    v_minutes_until_reset := 0;
  END IF;

  RETURN json_build_object(
    'success',             true,
    'remaining_swipes',    v_remaining,
    'minutes_until_reset', v_minutes_until_reset,
    'is_premium',          v_is_premium,
    'is_match',            v_is_match
  );
END;
$$;

GRANT EXECUTE ON FUNCTION like_user(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- superlike_user(p_user_id, p_target_id) — age guard + original logic
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION superlike_user(
  p_user_id   UUID,
  p_target_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_superlikes         INTEGER;
  v_swipe_info         JSON;
  v_is_premium         BOOLEAN;
  v_remaining_swipes   INT;
  v_reverse_like       BOOLEAN;
  v_match_id           UUID;
  v_u1                 UUID;
  v_u2                 UUID;
BEGIN
  IF p_user_id = p_target_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot superlike yourself');
  END IF;

  -- AGE GATE (App Store compliance): both parties must be 18+
  IF NOT public.is_user_18_plus(p_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'You must be 18 or older to use dating features');
  END IF;

  IF NOT public.is_user_18_plus(p_target_id) THEN
    RETURN json_build_object('success', false, 'error', 'Cannot interact with profiles of users under 18');
  END IF;

  -- Lock the sender's profile row so concurrent taps can't both pass the check
  SELECT superlikes_remaining INTO v_superlikes
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_superlikes IS NULL OR v_superlikes <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No superlikes remaining',
      'superlikes_remaining', 0
    );
  END IF;

  -- Enforce swipe limits (superlikes still count as a swipe, matching prior behaviour)
  v_swipe_info       := get_remaining_swipes(p_user_id);
  v_is_premium       := (v_swipe_info->>'is_premium')::BOOLEAN;
  v_remaining_swipes := (v_swipe_info->>'remaining_swipes')::INT;

  IF NOT v_is_premium AND v_remaining_swipes <= 0 THEN
    -- No superlike consumed — user simply can't swipe right now
    RETURN json_build_object(
      'success', false,
      'error', 'Out of swipes! Upgrade to premium for unlimited swipes.',
      'remaining_swipes', 0,
      'minutes_until_reset', (v_swipe_info->>'minutes_until_reset')::INT,
      'is_premium', false,
      'superlikes_remaining', v_superlikes
    );
  END IF;

  -- Record the like (flagged as a superlike)
  INSERT INTO likes (liker_id, liked_id, action, is_superlike)
  VALUES (p_user_id, p_target_id, 'like', TRUE)
  ON CONFLICT (liker_id, liked_id)
  DO UPDATE SET action = 'like', is_superlike = TRUE;

  -- Count the swipe for non-premium users
  IF NOT v_is_premium THEN
    INSERT INTO daily_swipes (user_id, swipe_count, last_reset)
    VALUES (p_user_id, 1, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET swipe_count = daily_swipes.swipe_count + 1;

    v_remaining_swipes := GREATEST(0, v_remaining_swipes - 1);
  END IF;

  -- Deduct exactly one superlike now that the like is committed
  UPDATE profiles
  SET superlikes_remaining = superlikes_remaining - 1
  WHERE id = p_user_id
  RETURNING superlikes_remaining INTO v_superlikes;

  -- Mutual like? create the match
  SELECT EXISTS(
    SELECT 1 FROM likes
    WHERE liker_id = p_target_id AND liked_id = p_user_id AND action = 'like'
  ) INTO v_reverse_like;

  IF v_reverse_like THEN
    v_u1 := LEAST(p_user_id, p_target_id);
    v_u2 := GREATEST(p_user_id, p_target_id);

    INSERT INTO matches (user1_id, user2_id)
    VALUES (v_u1, v_u2)
    ON CONFLICT (user1_id, user2_id) DO NOTHING
    RETURNING id INTO v_match_id;

    IF v_match_id IS NULL THEN
      SELECT id INTO v_match_id FROM matches
      WHERE user1_id = v_u1 AND user2_id = v_u2;
    END IF;

    PERFORM migrate_instant_messages_to_match(v_match_id, p_user_id, p_target_id);

    RETURN json_build_object(
      'success', true,
      'is_match', true,
      'match_id', v_match_id,
      'remaining_swipes', v_remaining_swipes,
      'minutes_until_reset', (v_swipe_info->>'minutes_until_reset')::INT,
      'is_premium', v_is_premium,
      'superlikes_remaining', v_superlikes
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'is_match', false,
    'match_id', NULL,
    'remaining_swipes', v_remaining_swipes,
    'minutes_until_reset', (v_swipe_info->>'minutes_until_reset')::INT,
    'is_premium', v_is_premium,
    'superlikes_remaining', v_superlikes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION superlike_user(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

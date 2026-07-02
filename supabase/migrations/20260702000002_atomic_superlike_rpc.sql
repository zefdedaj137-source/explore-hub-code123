-- Atomic superlike RPC
--
-- Previously the client called use_superlike() and then like_user() as two
-- separate round-trips. If like_user failed (e.g. swipe limit reached) after
-- use_superlike() had already decremented the balance, the user permanently
-- lost a superlike for nothing. This RPC performs the whole flow in a single
-- transaction: it verifies the superlike balance and swipe limit, records the
-- like, creates the match on a mutual like, and only then deducts the superlike.
-- On any early return nothing is written, so no credit is ever wasted.

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

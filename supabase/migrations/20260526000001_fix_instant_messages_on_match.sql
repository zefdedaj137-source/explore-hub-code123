-- Fix: instant messages orphaned after match is created
-- 1. Add migrate_instant_messages_to_match helper
-- 2. Update like_user to call it when a match forms
-- 3. Update send_instant_message to block when already matched

-- ─── 1. Helper: migrate IM messages into the match chat ──────────────────────
CREATE OR REPLACE FUNCTION migrate_instant_messages_to_match(
  p_match_id  UUID,
  p_user1_id  UUID,
  p_user2_id  UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Re-parent all instant messages between these two users to the match chat
  UPDATE messages
  SET    match_id          = p_match_id,
         is_instant_message = FALSE
  WHERE  is_instant_message = TRUE
    AND  (
           (sender_id = p_user1_id AND receiver_id = p_user2_id)
        OR (sender_id = p_user2_id AND receiver_id = p_user1_id)
         );

  -- Remove the instant_messages session record (no longer needed)
  DELETE FROM instant_messages
  WHERE  (sender_id = p_user1_id AND receiver_id = p_user2_id)
      OR (sender_id = p_user2_id AND receiver_id = p_user1_id);
END;
$$;

GRANT EXECUTE ON FUNCTION migrate_instant_messages_to_match(UUID, UUID, UUID) TO authenticated;


-- ─── 2. Update like_user to migrate IMs when a new match forms ───────────────
CREATE OR REPLACE FUNCTION like_user(
  current_user_id UUID,
  target_user_id  UUID,
  p_is_superlike  BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  like_exists          BOOLEAN;
  reverse_like_exists  BOOLEAN;
  match_id             UUID;
  swipe_info           JSON;
  is_premium           BOOLEAN;
  remaining_swipes     INT;
  result               JSON;
BEGIN
  -- Validate input
  IF current_user_id = target_user_id THEN
    RAISE EXCEPTION 'Cannot like yourself';
  END IF;

  -- Get swipe limit information
  swipe_info       := get_remaining_swipes(current_user_id);
  is_premium       := (swipe_info->>'is_premium')::BOOLEAN;
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

    -- Migrate any pre-existing instant messages into the match chat
    PERFORM migrate_instant_messages_to_match(match_id, current_user_id, target_user_id);

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


-- ─── 3. Update send_instant_message to block if already matched ───────────────
CREATE OR REPLACE FUNCTION send_instant_message(
  sender_user_id   UUID,
  receiver_user_id UUID,
  message_text     TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sender_credits        INTEGER;
  instant_message_id    UUID;
  new_message_id        UUID;
  already_matched       BOOLEAN;
  existing_match_id     UUID;
BEGIN
  -- Block send if users are already matched (they have a free match chat)
  SELECT EXISTS (
    SELECT 1 FROM matches
    WHERE (user1_id = LEAST(sender_user_id, receiver_user_id)
       AND user2_id = GREATEST(sender_user_id, receiver_user_id))
  ) INTO already_matched;

  IF already_matched THEN
    SELECT id INTO existing_match_id FROM matches
    WHERE user1_id = LEAST(sender_user_id, receiver_user_id)
      AND user2_id = GREATEST(sender_user_id, receiver_user_id);

    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_matched',
      'match_id', existing_match_id
    );
  END IF;

  -- Check sender has credits
  SELECT instant_message_credits INTO sender_credits
  FROM profiles
  WHERE id = sender_user_id;

  IF sender_credits IS NULL OR sender_credits < 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient instant message credits'
    );
  END IF;

  -- Deduct 1 credit
  UPDATE profiles
  SET instant_message_credits = instant_message_credits - 1
  WHERE id = sender_user_id;

  -- Create instant message record (idempotent)
  INSERT INTO instant_messages (sender_id, receiver_id)
  VALUES (sender_user_id, receiver_user_id)
  ON CONFLICT (sender_id, receiver_id) DO NOTHING
  RETURNING id INTO instant_message_id;

  -- Create message
  INSERT INTO messages (sender_id, receiver_id, content, is_instant_message)
  VALUES (sender_user_id, receiver_user_id, message_text, TRUE)
  RETURNING id INTO new_message_id;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', new_message_id,
    'credits_remaining', sender_credits - 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION send_instant_message(UUID, UUID, TEXT) TO authenticated;

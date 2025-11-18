-- Migration: Rename all instant_chat references to instant_message
-- This migration renames the table, columns, functions, and all related database objects
-- to use "instant_message" terminology instead of "instant_chat"

-- Step 1: Rename the instant_chats table to instant_messages
ALTER TABLE IF EXISTS instant_chats RENAME TO instant_messages;

-- Step 2: Rename the profile column instant_chat_credits to instant_message_credits
ALTER TABLE IF EXISTS profiles 
  RENAME COLUMN instant_chat_credits TO instant_message_credits;

-- Step 3: Rename the messages table column is_instant_chat to is_instant_message
ALTER TABLE IF EXISTS messages 
  RENAME COLUMN is_instant_chat TO is_instant_message;

-- Step 4: Drop old functions
DROP FUNCTION IF EXISTS send_instant_chat(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS reply_to_instant_chat(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS get_instant_chats(UUID);
DROP FUNCTION IF EXISTS get_instant_chat_messages(UUID, UUID);
DROP FUNCTION IF EXISTS mark_instant_chat_as_read(UUID, UUID);
DROP FUNCTION IF EXISTS grant_premium_instant_chat_credits(UUID, INTEGER);

-- Step 5: Create send_instant_message function (replaces send_instant_chat)
CREATE OR REPLACE FUNCTION send_instant_message(
  sender_user_id UUID,
  receiver_user_id UUID,
  message_text TEXT
)
RETURNS JSONB AS $$
DECLARE
  sender_credits INTEGER;
  new_message_id UUID;
  instant_message_id UUID;
BEGIN
  -- Check sender's credits
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

  -- Create instant message record
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION send_instant_message(UUID, UUID, TEXT) TO authenticated;

-- Step 6: Create reply_to_instant_message function (replaces reply_to_instant_chat)
CREATE OR REPLACE FUNCTION reply_to_instant_message(
  sender_user_id UUID,
  receiver_user_id UUID,
  message_text TEXT
)
RETURNS JSONB AS $$
DECLARE
  new_message_id UUID;
  instant_message_record_id UUID;
  instant_message_exists BOOLEAN;
BEGIN
  -- Check if there's an instant message between these users (either direction)
  SELECT EXISTS (
    SELECT 1 FROM instant_messages 
    WHERE (sender_id = receiver_user_id AND receiver_id = sender_user_id)
       OR (sender_id = sender_user_id AND receiver_id = receiver_user_id)
  ) INTO instant_message_exists;

  IF NOT instant_message_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No instant message found to reply to'
    );
  END IF;

  -- Get the instant message record ID
  SELECT id INTO instant_message_record_id
  FROM instant_messages
  WHERE (sender_id = receiver_user_id AND receiver_id = sender_user_id)
     OR (sender_id = sender_user_id AND receiver_id = receiver_user_id)
  LIMIT 1;

  -- Create message as instant message (stays in instant message, not regular match)
  -- Use receiver_id (not match_id) so it stays in instant messages
  INSERT INTO messages (sender_id, receiver_id, content, is_instant_message)
  VALUES (sender_user_id, receiver_user_id, message_text, TRUE)
  RETURNING id INTO new_message_id;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', new_message_id,
    'instant_message_id', instant_message_record_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reply_to_instant_message(UUID, UUID, TEXT) TO authenticated;

-- Step 7: Create get_instant_messages function (replaces get_instant_chats)
CREATE OR REPLACE FUNCTION get_instant_messages(user_id UUID)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  receiver_id UUID,
  sender_name TEXT,
  sender_avatar TEXT,
  sender_image TEXT,
  receiver_name TEXT,
  receiver_avatar TEXT,
  receiver_image TEXT,
  message_content TEXT,
  created_at TIMESTAMPTZ,
  is_sender BOOLEAN,
  message_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    im.id,
    im.sender_id,
    im.receiver_id,
    sp.full_name AS sender_name,
    sp.avatar_url AS sender_avatar,
    sp.profile_image_url AS sender_image,
    rp.full_name AS receiver_name,
    rp.avatar_url AS receiver_avatar,
    rp.profile_image_url AS receiver_image,
    m.content AS message_content,
    m.created_at,
    (im.sender_id = user_id) AS is_sender,
    (SELECT COUNT(*) FROM messages WHERE 
      (sender_id = im.sender_id AND receiver_id = im.receiver_id) OR
      (sender_id = im.receiver_id AND receiver_id = im.sender_id)
    ) AS message_count
  FROM instant_messages im
  LEFT JOIN profiles sp ON sp.id = im.sender_id
  LEFT JOIN profiles rp ON rp.id = im.receiver_id
  LEFT JOIN LATERAL (
    SELECT content, created_at 
    FROM messages 
    WHERE (sender_id = im.sender_id AND receiver_id = im.receiver_id)
       OR (sender_id = im.receiver_id AND receiver_id = im.sender_id)
    ORDER BY created_at DESC
    LIMIT 1
  ) m ON TRUE
  WHERE im.sender_id = user_id OR im.receiver_id = user_id
  ORDER BY m.created_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_instant_messages(UUID) TO authenticated;

-- Step 8: Create get_instant_message_messages function (replaces get_instant_chat_messages)
CREATE OR REPLACE FUNCTION get_instant_message_messages(
  user_id UUID,
  other_user_id UUID
)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  is_sender BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.sender_id,
    m.content,
    m.created_at,
    (m.sender_id = user_id) AS is_sender
  FROM messages m
  WHERE m.is_instant_message = TRUE
    AND ((m.sender_id = user_id AND m.receiver_id = other_user_id)
      OR (m.sender_id = other_user_id AND m.receiver_id = user_id))
  ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_instant_message_messages(UUID, UUID) TO authenticated;

-- Step 9: Create mark_instant_message_as_read function (replaces mark_instant_chat_as_read)
CREATE OR REPLACE FUNCTION mark_instant_message_as_read(
  p_sender_id UUID,
  p_receiver_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE messages
  SET read_at = NOW()
  WHERE sender_id = p_sender_id 
    AND receiver_id = p_receiver_id
    AND is_instant_message = TRUE
    AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_instant_message_as_read(UUID, UUID) TO authenticated;

-- Step 10: Create grant_premium_instant_message_credits function (replaces grant_premium_instant_chat_credits)
CREATE OR REPLACE FUNCTION grant_premium_instant_message_credits(
  user_id UUID,
  credit_amount INTEGER
)
RETURNS JSONB AS $$
DECLARE
  new_credits INTEGER;
BEGIN
  UPDATE profiles
  SET instant_message_credits = COALESCE(instant_message_credits, 0) + credit_amount
  WHERE id = user_id
  RETURNING instant_message_credits INTO new_credits;

  RETURN jsonb_build_object(
    'success', true,
    'new_credits', new_credits
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION grant_premium_instant_message_credits(UUID, INTEGER) TO authenticated;

-- Step 11: Update any indexes or constraints if needed
-- (Add any index renames here if they exist with instant_chat naming)

-- Step 12: Add comment to document the migration
COMMENT ON TABLE instant_messages IS 'Stores instant message relationships between users (renamed from instant_chats on 2025-11-17)';
COMMENT ON COLUMN profiles.instant_message_credits IS 'Number of instant message credits available (renamed from instant_chat_credits on 2025-11-17)';
COMMENT ON COLUMN messages.is_instant_message IS 'Whether this message is an instant message (renamed from is_instant_chat on 2025-11-17)';

-- Add read tracking to messages table and update get_instant_chats function
-- Run this in Supabase SQL Editor

-- Step 1: Add read_at column to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Create index for faster unread queries
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at) WHERE read_at IS NULL;

-- Step 3: Create function to mark messages as read
CREATE OR REPLACE FUNCTION mark_instant_chat_as_read(
  p_sender_id uuid,
  p_receiver_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark all messages from sender to receiver as read
  UPDATE messages
  SET read_at = NOW()
  WHERE is_instant_chat = TRUE
    AND sender_id = p_sender_id
    AND receiver_id = p_receiver_id
    AND read_at IS NULL;
END;
$$;

-- Step 4: Drop and recreate get_instant_chats with read tracking
DROP FUNCTION IF EXISTS get_instant_chats(uuid);

CREATE OR REPLACE FUNCTION get_instant_chats(user_id uuid)
RETURNS TABLE (
  id uuid,
  sender_id uuid,
  receiver_id uuid,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint,
  sender_name text,
  sender_avatar text,
  receiver_name text,
  receiver_avatar text,
  message_content text,
  created_at timestamptz,
  is_sender boolean,
  message_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH latest_messages AS (
    SELECT DISTINCT ON (
      CASE 
        WHEN m.sender_id < m.receiver_id 
        THEN m.sender_id::text || m.receiver_id::text 
        ELSE m.receiver_id::text || m.sender_id::text 
      END
    )
      m.sender_id,
      m.receiver_id,
      m.content,
      m.created_at
    FROM messages m
    WHERE m.is_instant_chat = TRUE
      AND (m.sender_id = user_id OR m.receiver_id = user_id)
      -- Exclude if users are already matched
      AND NOT EXISTS (
        SELECT 1 FROM matches ma
        WHERE (ma.user1_id = m.sender_id AND ma.user2_id = m.receiver_id)
           OR (ma.user1_id = m.receiver_id AND ma.user2_id = m.sender_id)
      )
    ORDER BY 
      CASE 
        WHEN m.sender_id < m.receiver_id 
        THEN m.sender_id::text || m.receiver_id::text 
        ELSE m.receiver_id::text || m.sender_id::text 
      END,
      m.created_at DESC
  )
  SELECT 
    gen_random_uuid() as id,
    lm.sender_id,
    lm.receiver_id,
    lm.content as last_message,
    lm.created_at as last_message_at,
    (
      SELECT COUNT(*)::bigint
      FROM messages m2
      WHERE m2.is_instant_chat = TRUE
        AND m2.receiver_id = user_id
        AND (
          (m2.sender_id = lm.sender_id AND m2.receiver_id = user_id)
          OR (m2.sender_id = lm.receiver_id AND m2.receiver_id = user_id)
        )
        AND m2.read_at IS NULL
    ) as unread_count,
    CASE 
      WHEN lm.sender_id = user_id THEN receiver_profile.full_name
      ELSE sender_profile.full_name
    END as sender_name,
    CASE 
      WHEN lm.sender_id = user_id THEN receiver_profile.profile_image_url
      ELSE sender_profile.profile_image_url
    END as sender_avatar,
    CASE 
      WHEN lm.receiver_id = user_id THEN sender_profile.full_name
      ELSE receiver_profile.full_name
    END as receiver_name,
    CASE 
      WHEN lm.receiver_id = user_id THEN sender_profile.profile_image_url
      ELSE receiver_profile.profile_image_url
    END as receiver_avatar,
    lm.content as message_content,
    lm.created_at,
    (lm.sender_id = user_id) as is_sender,
    (
      SELECT COUNT(*)::bigint
      FROM messages m3
      WHERE m3.is_instant_chat = TRUE
        AND (
          (m3.sender_id = lm.sender_id AND m3.receiver_id = lm.receiver_id)
          OR (m3.sender_id = lm.receiver_id AND m3.receiver_id = lm.sender_id)
        )
    ) as message_count
  FROM latest_messages lm
  JOIN profiles sender_profile ON lm.sender_id = sender_profile.id
  JOIN profiles receiver_profile ON lm.receiver_id = receiver_profile.id
  ORDER BY lm.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_instant_chats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_instant_chat_as_read(uuid, uuid) TO authenticated;

-- Step 5: Create function to get all messages in an instant chat conversation
CREATE OR REPLACE FUNCTION get_instant_chat_messages(
  user_id uuid,
  other_user_id uuid
)
RETURNS TABLE (
  id uuid,
  sender_id uuid,
  content text,
  created_at timestamptz,
  is_sender boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.sender_id,
    m.content,
    m.created_at,
    (m.sender_id = user_id) as is_sender
  FROM messages m
  WHERE m.is_instant_chat = TRUE
    AND (
      (m.sender_id = user_id AND m.receiver_id = other_user_id)
      OR (m.sender_id = other_user_id AND m.receiver_id = user_id)
    )
  ORDER BY m.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_instant_chat_messages(uuid, uuid) TO authenticated;

-- Step 6: Drop and recreate reply_to_instant_chat function with message limit
DROP FUNCTION IF EXISTS reply_to_instant_chat(uuid, uuid, text);

CREATE OR REPLACE FUNCTION reply_to_instant_chat(
  sender_user_id uuid,
  receiver_user_id uuid,
  message_text text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sender_message_count integer;
  new_message_id uuid;
BEGIN
  -- Check if users are already matched (shouldn't use instant chat if matched)
  IF EXISTS (
    SELECT 1 FROM matches
    WHERE (user1_id = sender_user_id AND user2_id = receiver_user_id)
       OR (user1_id = receiver_user_id AND user2_id = sender_user_id)
  ) THEN
    RETURN json_build_object('error', 'Users are already matched. Use regular chat instead.');
  END IF;

  -- Count how many instant chat messages the sender has already sent to this receiver
  SELECT COUNT(*)::integer INTO sender_message_count
  FROM messages
  WHERE is_instant_chat = TRUE
    AND sender_id = sender_user_id
    AND receiver_id = receiver_user_id;

  -- Check if sender has reached the 20 message limit
  IF sender_message_count >= 20 THEN
    RETURN json_build_object('error', 'Message limit reached. Like their profile to unlock unlimited messaging.');
  END IF;

  -- Insert the new message
  INSERT INTO messages (sender_id, receiver_id, content, is_instant_chat)
  VALUES (sender_user_id, receiver_user_id, message_text, TRUE)
  RETURNING id INTO new_message_id;

  RETURN json_build_object(
    'success', true,
    'message_id', new_message_id,
    'remaining_messages', 20 - sender_message_count - 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION reply_to_instant_chat(uuid, uuid, text) TO authenticated;

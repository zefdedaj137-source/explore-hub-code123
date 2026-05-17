-- Add the reply_to_instant_message function
-- Copy this entire file and run it in Supabase SQL Editor

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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION reply_to_instant_message(UUID, UUID, TEXT) TO authenticated;

-- Function to get all messages in an instant message conversation
CREATE OR REPLACE FUNCTION get_instant_message_messages(
  user_id UUID,
  other_user_id UUID
)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  is_sender BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.sender_id,
    m.content,
    m.created_at,
    (m.sender_id = user_id) as is_sender
  FROM messages m
  WHERE m.is_instant_message = TRUE
    AND m.receiver_id IS NOT NULL
    AND (
      (m.sender_id = user_id AND m.receiver_id = other_user_id)
      OR (m.sender_id = other_user_id AND m.receiver_id = user_id)
    )
  ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_instant_message_messages(UUID, UUID) TO authenticated;

-- Drop the old get_instant_messages function first (since we're changing its return type)
DROP FUNCTION IF EXISTS get_instant_messages(UUID);

-- Update get_instant_messages to show the latest message
CREATE OR REPLACE FUNCTION get_instant_messages(user_id UUID)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  receiver_id UUID,
  sender_name TEXT,
  sender_image TEXT,
  receiver_name TEXT,
  receiver_image TEXT,
  message_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  is_sender BOOLEAN,
  message_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    im.id,
    im.sender_id,
    im.receiver_id,
    sender.full_name as sender_name,
    sender.profile_image_url as sender_image,
    receiver.full_name as receiver_name,
    receiver.profile_image_url as receiver_image,
    latest_msg.content as message_content,
    latest_msg.created_at,
    (im.sender_id = user_id) as is_sender,
    msg_count.count::INTEGER as message_count
  FROM instant_messages im
  JOIN profiles sender ON im.sender_id = sender.id
  JOIN profiles receiver ON im.receiver_id = receiver.id
  LEFT JOIN LATERAL (
    SELECT content, created_at
    FROM messages m
    WHERE m.is_instant_message = TRUE
      AND (
        (m.sender_id = im.sender_id AND m.receiver_id = im.receiver_id)
        OR (m.sender_id = im.receiver_id AND m.receiver_id = im.sender_id)
      )
    ORDER BY m.created_at DESC
    LIMIT 1
  ) latest_msg ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as count
    FROM messages m
    WHERE m.is_instant_message = TRUE
      AND (
        (m.sender_id = im.sender_id AND m.receiver_id = im.receiver_id)
        OR (m.sender_id = im.receiver_id AND m.receiver_id = im.sender_id)
      )
  ) msg_count ON true
  WHERE im.sender_id = user_id OR im.receiver_id = user_id
  ORDER BY latest_msg.created_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify it was created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'reply_to_instant_message'
AND routine_schema = 'public';

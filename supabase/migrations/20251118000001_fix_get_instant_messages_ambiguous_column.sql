-- Fix ambiguous column reference in get_instant_messages function
-- The error occurs because both instant_messages and messages tables have a created_at column

DROP FUNCTION IF EXISTS get_instant_messages(UUID);

CREATE OR REPLACE FUNCTION get_instant_messages(p_user_id UUID)
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
    sp.profile_image_url AS sender_avatar,
    sp.profile_image_url AS sender_image,
    rp.full_name AS receiver_name,
    rp.profile_image_url AS receiver_avatar,
    rp.profile_image_url AS receiver_image,
    m.content AS message_content,
    m.created_at,
    (im.sender_id = p_user_id) AS is_sender,
    (SELECT COUNT(*) FROM messages msg
      WHERE ((msg.sender_id = im.sender_id AND msg.receiver_id = im.receiver_id AND msg.is_instant_message = TRUE) OR
             (msg.sender_id = im.receiver_id AND msg.receiver_id = im.sender_id AND msg.is_instant_message = TRUE))
    ) AS message_count
  FROM instant_messages im
  LEFT JOIN profiles sp ON sp.id = im.sender_id
  LEFT JOIN profiles rp ON rp.id = im.receiver_id
  LEFT JOIN LATERAL (
    SELECT messages.content, messages.created_at 
    FROM messages 
    WHERE ((messages.sender_id = im.sender_id AND messages.receiver_id = im.receiver_id) OR
           (messages.sender_id = im.receiver_id AND messages.receiver_id = im.sender_id))
      AND messages.is_instant_message = TRUE
    ORDER BY messages.created_at DESC
    LIMIT 1
  ) m ON TRUE
  WHERE im.sender_id = p_user_id OR im.receiver_id = p_user_id
  ORDER BY COALESCE(m.created_at, im.created_at) DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_instant_messages(UUID) TO authenticated;

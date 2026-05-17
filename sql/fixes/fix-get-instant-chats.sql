-- Fix get_instant_chats function to compute data from messages table
-- Run this in Supabase SQL Editor

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
  receiver_avatar text
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
        THEN m.sender_id || m.receiver_id 
        ELSE m.receiver_id || m.sender_id 
      END
    )
      m.sender_id,
      m.receiver_id,
      m.content,
      m.created_at
    FROM messages m
    WHERE m.is_instant_chat = TRUE
      AND (m.sender_id = user_id OR m.receiver_id = user_id)
    ORDER BY 
      CASE 
        WHEN m.sender_id < m.receiver_id 
        THEN m.sender_id || m.receiver_id 
        ELSE m.receiver_id || m.sender_id 
      END,
      m.created_at DESC
  )
  SELECT 
    gen_random_uuid() as id,
    lm.sender_id,
    lm.receiver_id,
    lm.content as last_message,
    lm.created_at as last_message_at,
    0::bigint as unread_count,  -- Simplified: can be enhanced later with a read tracking system
    CASE 
      WHEN lm.sender_id = user_id THEN receiver_profile.full_name
      ELSE sender_profile.full_name
    END as sender_name,
    CASE 
      WHEN lm.sender_id = user_id THEN receiver_profile.avatar_url
      ELSE sender_profile.avatar_url
    END as sender_avatar,
    CASE 
      WHEN lm.receiver_id = user_id THEN sender_profile.full_name
      ELSE receiver_profile.full_name
    END as receiver_name,
    CASE 
      WHEN lm.receiver_id = user_id THEN sender_profile.avatar_url
      ELSE receiver_profile.avatar_url
    END as receiver_avatar
  FROM latest_messages lm
  JOIN profiles sender_profile ON lm.sender_id = sender_profile.id
  JOIN profiles receiver_profile ON lm.receiver_id = receiver_profile.id
  ORDER BY lm.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_instant_chats(uuid) TO authenticated;

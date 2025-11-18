-- Add instant chat feature columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS instant_chat_credits INTEGER DEFAULT 0;

-- Add receiver_id column to messages table for instant chats (when there's no match yet)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Add instant_chat flag to messages table to track instant chat messages
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_instant_chat BOOLEAN DEFAULT FALSE;

-- Make match_id nullable since instant chats don't have a match yet
ALTER TABLE messages
ALTER COLUMN match_id DROP NOT NULL;

-- Add constraint: either match_id OR receiver_id must be set
ALTER TABLE messages
ADD CONSTRAINT messages_match_or_receiver_check 
CHECK (
  (match_id IS NOT NULL AND receiver_id IS NULL) OR 
  (match_id IS NULL AND receiver_id IS NOT NULL)
);

-- Create instant_chats table to track instant chat requests
CREATE TABLE IF NOT EXISTS instant_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  UNIQUE(sender_id, receiver_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_instant_chats_sender ON instant_chats(sender_id);
CREATE INDEX IF NOT EXISTS idx_instant_chats_receiver ON instant_chats(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_instant_chat ON messages(is_instant_chat) WHERE is_instant_chat = TRUE;
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id) WHERE receiver_id IS NOT NULL;

-- Function to grant instant chat credits when user becomes premium
CREATE OR REPLACE FUNCTION grant_premium_instant_chat_credits(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET instant_chat_credits = instant_chat_credits + 5
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send instant chat (using a credit)
CREATE OR REPLACE FUNCTION send_instant_chat(
  sender_user_id UUID,
  receiver_user_id UUID,
  message_text TEXT
)
RETURNS JSONB AS $$
DECLARE
  current_credits INTEGER;
  new_message_id UUID;
  existing_match_id UUID;
BEGIN
  -- Check if users are already matched
  SELECT id INTO existing_match_id
  FROM matches
  WHERE (user1_id = sender_user_id AND user2_id = receiver_user_id)
     OR (user1_id = receiver_user_id AND user2_id = sender_user_id);

  IF existing_match_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Already matched with this user'
    );
  END IF;

  -- Get current credits
  SELECT instant_chat_credits INTO current_credits
  FROM profiles
  WHERE id = sender_user_id;

  -- Check if user has credits
  IF current_credits <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No instant chat credits available'
    );
  END IF;

  -- Check if instant chat already exists
  IF EXISTS (
    SELECT 1 FROM instant_chats 
    WHERE sender_id = sender_user_id AND receiver_id = receiver_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Already sent instant chat to this user'
    );
  END IF;

  -- Deduct credit
  UPDATE profiles
  SET instant_chat_credits = instant_chat_credits - 1
  WHERE id = sender_user_id;

  -- Create message (for instant chat, use receiver_id instead of match_id)
  INSERT INTO messages (sender_id, receiver_id, content, is_instant_chat)
  VALUES (sender_user_id, receiver_user_id, message_text, TRUE)
  RETURNING id INTO new_message_id;

  -- Create instant chat record
  INSERT INTO instant_chats (sender_id, receiver_id, message_id)
  VALUES (sender_user_id, receiver_user_id, new_message_id);

  RETURN jsonb_build_object(
    'success', true,
    'message_id', new_message_id,
    'credits_remaining', current_credits - 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get instant chats for a user (both sent and received)
CREATE OR REPLACE FUNCTION get_instant_chats(user_id UUID)
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
  is_sender BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ic.id,
    ic.sender_id,
    ic.receiver_id,
    sender.full_name as sender_name,
    sender.profile_image_url as sender_image,
    receiver.full_name as receiver_name,
    receiver.profile_image_url as receiver_image,
    m.content as message_content,
    ic.created_at,
    (ic.sender_id = user_id) as is_sender
  FROM instant_chats ic
  JOIN profiles sender ON ic.sender_id = sender.id
  JOIN profiles receiver ON ic.receiver_id = receiver.id
  LEFT JOIN messages m ON ic.message_id = m.id
  WHERE ic.sender_id = user_id OR ic.receiver_id = user_id
  ORDER BY ic.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION grant_premium_instant_chat_credits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_instant_chat(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_instant_chats(UUID) TO authenticated;

-- Function to reply to instant chat (FREE and creates a match)
CREATE OR REPLACE FUNCTION reply_to_instant_chat(
  sender_user_id UUID,
  receiver_user_id UUID,
  message_text TEXT
)
RETURNS JSONB AS $$
DECLARE
  new_message_id UUID;
  existing_match_id UUID;
  new_match_id UUID;
  instant_chat_exists BOOLEAN;
BEGIN
  -- Check if there's an instant chat from receiver to sender (they sent us the instant chat)
  SELECT EXISTS (
    SELECT 1 FROM instant_chats 
    WHERE sender_id = receiver_user_id AND receiver_id = sender_user_id
  ) INTO instant_chat_exists;

  IF NOT instant_chat_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No instant chat found to reply to'
    );
  END IF;

  -- Check if users are already matched
  SELECT id INTO existing_match_id
  FROM matches
  WHERE (user1_id = sender_user_id AND user2_id = receiver_user_id)
     OR (user1_id = receiver_user_id AND user2_id = sender_user_id);

  -- If not matched, create a match (replying creates a match automatically)
  IF existing_match_id IS NULL THEN
    INSERT INTO matches (user1_id, user2_id)
    VALUES (sender_user_id, receiver_user_id)
    RETURNING id INTO new_match_id;
    
    existing_match_id := new_match_id;
  END IF;

  -- Create message with the match_id (now they're matched, so use match_id)
  INSERT INTO messages (match_id, sender_id, content, is_instant_chat)
  VALUES (existing_match_id, sender_user_id, message_text, FALSE)
  RETURNING id INTO new_message_id;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', new_message_id,
    'match_id', existing_match_id,
    'matched', (new_match_id IS NOT NULL)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION reply_to_instant_chat(UUID, UUID, TEXT) TO authenticated;

-- Enable RLS on instant_chats table
ALTER TABLE instant_chats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for instant_chats
CREATE POLICY "Users can view their own instant chats"
  ON instant_chats FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can create instant chats"
  ON instant_chats FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Update messages RLS policies to handle instant chats
DROP POLICY IF EXISTS "Users can view messages from their matches" ON messages;

CREATE POLICY "Users can view messages from their matches or instant chats"
  ON messages FOR SELECT
  TO authenticated
  USING (
    -- Can view messages from matches
    (EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    ))
    OR
    -- Can view instant chat messages where user is sender or receiver
    (is_instant_chat = TRUE AND (sender_id = auth.uid() OR receiver_id = auth.uid()))
  );

-- Allow users to insert messages for matches or instant chats
DROP POLICY IF EXISTS "Users can send messages to their matches" ON messages;

CREATE POLICY "Users can send messages to their matches or instant chats"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    (
      -- Can send to matches
      (EXISTS (
        SELECT 1 FROM matches
        WHERE matches.id = messages.match_id
        AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
      ))
      OR
      -- Can send instant chat messages
      (is_instant_chat = TRUE AND receiver_id IS NOT NULL)
    )
  );

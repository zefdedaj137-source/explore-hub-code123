-- Migration: Fix remaining instant_chat references after partial migration
-- This addresses any leftover items that weren't renamed in the previous migration

-- Drop the old grant_premium_instant_chat_credits function if it still exists
DROP FUNCTION IF EXISTS grant_premium_instant_chat_credits(UUID);

-- Rename foreign key constraints that still have old names
DO $$
BEGIN
  -- Rename instant_chats foreign keys to instant_messages
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'instant_chats_message_id_fkey'
  ) THEN
    ALTER TABLE instant_messages 
      RENAME CONSTRAINT instant_chats_message_id_fkey TO instant_messages_message_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'instant_chats_receiver_id_fkey'
  ) THEN
    ALTER TABLE instant_messages 
      RENAME CONSTRAINT instant_chats_receiver_id_fkey TO instant_messages_receiver_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'instant_chats_sender_id_fkey'
  ) THEN
    ALTER TABLE instant_messages 
      RENAME CONSTRAINT instant_chats_sender_id_fkey TO instant_messages_sender_id_fkey;
  END IF;
END $$;

-- Add comments to confirm completion
COMMENT ON TABLE instant_messages IS 'Stores instant message relationships between users (fully migrated on 2025-11-18)';

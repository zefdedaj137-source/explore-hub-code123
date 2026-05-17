-- Test the reply_to_instant_chat function
-- Run these queries step by step to diagnose the issue

-- 1. Check if the function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'reply_to_instant_chat'
AND routine_schema = 'public';
-- Expected: 1 row with routine_name = 'reply_to_instant_chat'

-- 2. Get your user IDs to test with
SELECT id, full_name FROM profiles LIMIT 5;

-- 3. Check if there are any instant chats in the database
SELECT * FROM instant_chats;

-- 4. Check messages table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- 5. Check if match_id is nullable
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages' AND column_name = 'match_id';
-- Expected: is_nullable = 'YES'

-- 6. Check the constraint
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'messages_match_or_receiver_check';

-- 7. Test sending an instant chat first (replace with real UUIDs)
-- SELECT send_instant_chat(
--   'SENDER_ID'::uuid,
--   'RECEIVER_ID'::uuid,
--   'Test message'
-- );

-- 8. After sending, try to reply (swap the IDs)
-- SELECT reply_to_instant_chat(
--   'RECEIVER_ID'::uuid,  -- Person replying
--   'SENDER_ID'::uuid,    -- Original sender
--   'Test reply'
-- );

-- 9. Check if match was created
SELECT * FROM matches ORDER BY created_at DESC LIMIT 5;

-- 10. Check messages created
SELECT id, match_id, sender_id, receiver_id, content, is_instant_chat, created_at
FROM messages 
ORDER BY created_at DESC 
LIMIT 10;

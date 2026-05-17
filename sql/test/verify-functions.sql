-- Verify all instant chat functions exist
-- Run each query step by step in Supabase SQL Editor

-- STEP 1: Check if reply_to_instant_chat exists
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_name = 'reply_to_instant_chat'
AND routine_schema = 'public';
-- Expected: 1 row with routine_name = 'reply_to_instant_chat'

-- STEP 2: Check if get_instant_chat_messages exists
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'get_instant_chat_messages'
AND routine_schema = 'public';
-- Expected: 1 row with routine_name = 'get_instant_chat_messages'

-- STEP 3: Check if get_instant_chats exists
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'get_instant_chats'
AND routine_schema = 'public';
-- Expected: 1 row with routine_name = 'get_instant_chats'

-- STEP 4: Check the parameters of get_instant_chats
SELECT 
  r.routine_name,
  p.parameter_name,
  p.data_type,
  p.parameter_mode
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p 
  ON r.specific_name = p.specific_name
WHERE r.routine_name = 'get_instant_chats'
  AND r.routine_schema = 'public'
ORDER BY p.ordinal_position;
-- Should show: user_id parameter (IN) and all return columns (OUT)

-- STEP 5: Test calling get_instant_chats with your user ID
-- Replace '2bab43f9-780b-4339-9858-4775292fe1e2' with your actual user ID
SELECT * FROM get_instant_chats('2bab43f9-780b-4339-9858-4775292fe1e2'::uuid);
-- This should return instant chats or empty result (no error)

-- STEP 6: If you get errors, check instant_chats table
SELECT 
  ic.*,
  sender.full_name as sender_name,
  receiver.full_name as receiver_name
FROM instant_chats ic
JOIN profiles sender ON ic.sender_id = sender.id
JOIN profiles receiver ON ic.receiver_id = receiver.id
WHERE ic.sender_id = '2bab43f9-780b-4339-9858-4775292fe1e2'::uuid
   OR ic.receiver_id = '2bab43f9-780b-4339-9858-4775292fe1e2'::uuid;
-- Shows your instant chats

-- STEP 7: Check messages related to instant chats
SELECT 
  m.id,
  m.sender_id,
  m.receiver_id,
  m.content,
  m.is_instant_chat,
  m.created_at,
  sender.full_name as sender_name,
  receiver.full_name as receiver_name
FROM messages m
LEFT JOIN profiles sender ON m.sender_id = sender.id
LEFT JOIN profiles receiver ON m.receiver_id = receiver.id
WHERE m.is_instant_chat = TRUE
  AND (m.sender_id = '2bab43f9-780b-4339-9858-4775292fe1e2'::uuid
       OR m.receiver_id = '2bab43f9-780b-4339-9858-4775292fe1e2'::uuid)
ORDER BY m.created_at DESC;
-- Shows all instant chat messages

-- IF ANY FUNCTION IS MISSING, RUN add-reply-function.sql AGAIN

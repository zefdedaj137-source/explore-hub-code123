-- Verify Instant Chat Migration
-- Run these commands in Supabase SQL Editor to check if everything was created

-- 1. Check if instant_chat_credits column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'instant_chat_credits';
-- Expected: 1 row with column_name = 'instant_chat_credits'

-- 2. Check if is_instant_chat column exists in messages
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name = 'is_instant_chat';
-- Expected: 1 row with column_name = 'is_instant_chat'

-- 3. Check if instant_chats table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'instant_chats';
-- Expected: 1 row with table_name = 'instant_chats'

-- 4. Check if send_instant_chat function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'send_instant_chat'
AND routine_schema = 'public';
-- Expected: 1 row with routine_name = 'send_instant_chat'

-- 5. Test the function (this will show the exact error if there is one)
-- First, let's get two user IDs from your database
SELECT id, full_name FROM profiles LIMIT 2;

-- Then test with actual IDs (replace these with IDs from above query)
-- Example:
-- SELECT send_instant_chat(
--   '596116f8-cde5-4a9e-bb4c-6e91f7b94eae'::uuid,  -- sender (your ID)
--   'SECOND-USER-ID-HERE'::uuid,                    -- receiver (another user's ID)
--   'Test message'
-- );

-- 6. If all checks pass, grant yourself credits
UPDATE profiles 
SET instant_chat_credits = 5 
WHERE id = '596116f8-cde5-4a9e-bb4c-6e91f7b94eae';

-- 7. Verify credits were granted
SELECT id, full_name, instant_chat_credits 
FROM profiles 
WHERE id = '596116f8-cde5-4a9e-bb4c-6e91f7b94eae';

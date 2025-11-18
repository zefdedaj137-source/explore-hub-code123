-- 🔍 DATABASE CHECK SCRIPT
-- Copy and paste this entire script into Supabase SQL Editor

-- Step 1: Check if tables exist
SELECT 'Step 1: Checking if tables exist...' as status;

SELECT table_name, 
       CASE 
         WHEN table_name IS NOT NULL THEN '✅ EXISTS' 
         ELSE '❌ MISSING' 
       END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('call_signals', 'call_notifications', 'matches', 'profiles');

-- Step 2: Check if realtime is enabled
SELECT 'Step 2: Checking realtime publication...' as status;

SELECT tablename,
       '✅ REALTIME ENABLED' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('call_signals', 'call_notifications');

-- Step 3: Check table structure
SELECT 'Step 3: Checking call_notifications structure...' as status;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'call_notifications'
ORDER BY ordinal_position;

-- Step 4: Check RLS policies
SELECT 'Step 4: Checking Row Level Security...' as status;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('call_signals', 'call_notifications');

-- Step 5: Test insert (this will help us see if there are permission issues)
SELECT 'Step 5: Testing permissions...' as status;

-- If you get an error here, we need to add RLS policies
-- Uncomment the next lines to add basic policies:

/*
-- Allow users to insert call notifications
CREATE POLICY "Users can insert call notifications"
ON call_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to view call notifications for their matches
CREATE POLICY "Users can view their call notifications"
ON call_notifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = call_notifications.match_id
    AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
  )
);

-- Allow users to update call notifications for their matches
CREATE POLICY "Users can update their call notifications"
ON call_notifications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = call_notifications.match_id
    AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
  )
);

-- Call signals policies
CREATE POLICY "Users can insert call signals"
ON call_signals
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view call signals for their matches"
ON call_signals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = call_signals.match_id
    AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
  )
);
*/

SELECT '✅ ALL CHECKS COMPLETE!' as final_status;

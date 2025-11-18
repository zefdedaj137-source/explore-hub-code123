-- =====================================================
-- FIX MESSAGES TABLE RLS POLICIES
-- Run this in Supabase SQL Editor to fix 403 errors
-- =====================================================

-- First, add voice_url column if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_url TEXT;

-- Check if messages table exists and enable RLS
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view messages in their matches" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their matches" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Policy 1: Users can view messages in matches they're part of
CREATE POLICY "Users can view messages in their matches"
ON messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = messages.match_id
    AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
  )
);

-- Policy 2: Users can send messages in matches they're part of
CREATE POLICY "Users can send messages in their matches"
ON messages
FOR INSERT
WITH CHECK (
  -- Check if the sender is the authenticated user
  sender_id = auth.uid()
  AND
  -- Check if the user is part of this match
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = messages.match_id
    AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
  )
);

-- Policy 3: Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
ON messages
FOR DELETE
USING (sender_id = auth.uid());

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  'CREATED ✓' as status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'messages'
ORDER BY policyname;

-- Check if messages table has the correct structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
AND table_schema = 'public'
ORDER BY ordinal_position;

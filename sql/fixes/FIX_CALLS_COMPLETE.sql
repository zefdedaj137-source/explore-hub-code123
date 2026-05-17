-- 🔧 COMPLETE CALL SYSTEM FIX
-- Run this entire script in Supabase SQL Editor

-- Step 1: Create tables if they don't exist
CREATE TABLE IF NOT EXISTS call_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  signal_data TEXT NOT NULL,
  call_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL,
  status TEXT DEFAULT 'calling',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- Step 2: Enable RLS
ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_notifications ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can insert call notifications" ON call_notifications;
DROP POLICY IF EXISTS "Users can view their call notifications" ON call_notifications;
DROP POLICY IF EXISTS "Users can update their call notifications" ON call_notifications;
DROP POLICY IF EXISTS "Users can insert call signals" ON call_signals;
DROP POLICY IF EXISTS "Users can view call signals for their matches" ON call_signals;

-- Step 4: Create NEW policies that actually work

-- Call Notifications Policies
CREATE POLICY "Users can insert call notifications"
ON call_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

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

-- Call Signals Policies
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

-- Step 5: Enable Realtime (ignore if already exists)
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE call_signals;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE call_notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 6: Verify everything
SELECT 'Step 1: Tables exist?' as check_type;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('call_signals', 'call_notifications');

SELECT 'Step 2: Realtime enabled?' as check_type;
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('call_signals', 'call_notifications');

SELECT 'Step 3: Policies created?' as check_type;
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('call_signals', 'call_notifications');

SELECT '✅ ALL DONE! Try calling now!' as final_message;

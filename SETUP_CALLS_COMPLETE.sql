-- =====================================================
-- COMPLETE SETUP SCRIPT FOR INCOMING CALLS
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- Step 1: Create call_signals table
CREATE TABLE IF NOT EXISTS call_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  signal_data TEXT NOT NULL,
  call_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create call_notifications table
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

-- Step 3: Enable Row Level Security
ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_notifications ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies for call_signals
DROP POLICY IF EXISTS "Users can view signals in their matches" ON call_signals;
CREATE POLICY "Users can view signals in their matches"
ON call_signals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = call_signals.match_id
    AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can send signals in their matches" ON call_signals;
CREATE POLICY "Users can send signals in their matches"
ON call_signals
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = call_signals.match_id
    AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can delete their own signals" ON call_signals;
CREATE POLICY "Users can delete their own signals"
ON call_signals
FOR DELETE
USING (sender_id = auth.uid());

-- Step 5: RLS Policies for call_notifications
DROP POLICY IF EXISTS "Users can view notifications in their matches" ON call_notifications;
CREATE POLICY "Users can view notifications in their matches"
ON call_notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = call_notifications.match_id
    AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can create call notifications" ON call_notifications;
CREATE POLICY "Users can create call notifications"
ON call_notifications
FOR INSERT
WITH CHECK (
  caller_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = call_notifications.match_id
    AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update call notifications" ON call_notifications;
CREATE POLICY "Users can update call notifications"
ON call_notifications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = call_notifications.match_id
    AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
  )
);

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_signals_match_id ON call_signals(match_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_created_at ON call_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_notifications_match_id ON call_notifications(match_id);
CREATE INDEX IF NOT EXISTS idx_call_notifications_status ON call_notifications(status);
CREATE INDEX IF NOT EXISTS idx_call_notifications_created_at ON call_notifications(created_at DESC);

-- Step 7: ENABLE REALTIME (IMPORTANT!)
ALTER PUBLICATION supabase_realtime ADD TABLE call_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE call_notifications;

-- Step 8: Verify tables were created
SELECT 
  'call_signals' as table_name,
  COUNT(*) as row_count
FROM call_signals
UNION ALL
SELECT 
  'call_notifications' as table_name,
  COUNT(*) as row_count
FROM call_notifications;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ SUCCESS! Call tables created and realtime enabled!';
  RAISE NOTICE '📞 You can now test incoming calls!';
  RAISE NOTICE '🎉 No need to manually enable in UI - already done!';
END $$;

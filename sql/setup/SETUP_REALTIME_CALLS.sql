-- =====================================================
-- SETUP REAL-TIME VOICE & VIDEO CALLS
-- Run this in Supabase SQL Editor
-- =====================================================

-- Table 1: Call Signals (for WebRTC signaling)
CREATE TABLE IF NOT EXISTS call_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL, -- 'offer', 'answer', 'ice-candidate', 'end-call'
  signal_data JSONB NOT NULL,
  call_type TEXT, -- 'voice' or 'video'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: Call Notifications
CREATE TABLE IF NOT EXISTS call_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL, -- 'voice' or 'video'
  status TEXT DEFAULT 'calling', -- 'calling', 'answered', 'missed', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_signals
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

CREATE POLICY "Users can send signals in their matches"
ON call_signals
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = call_signals.match_id
    AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
  )
);

-- RLS Policies for call_notifications
CREATE POLICY "Users can view call notifications in their matches"
ON call_notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = call_notifications.match_id
    AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
  )
);

CREATE POLICY "Users can create call notifications"
ON call_notifications
FOR INSERT
WITH CHECK (
  caller_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = call_notifications.match_id
    AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
  )
);

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_signals_match_id ON call_signals(match_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_created_at ON call_signals(created_at);
CREATE INDEX IF NOT EXISTS idx_call_notifications_match_id ON call_notifications(match_id);
CREATE INDEX IF NOT EXISTS idx_call_notifications_status ON call_notifications(status);

-- Enable realtime for call_signals
ALTER PUBLICATION supabase_realtime ADD TABLE call_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE call_notifications;

-- Verify tables were created
SELECT 
  table_name,
  'CREATED ✓' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('call_signals', 'call_notifications');

-- Verify policies were created
SELECT 
  tablename,
  policyname,
  'POLICY CREATED ✓' as status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('call_signals', 'call_notifications')
ORDER BY tablename, policyname;

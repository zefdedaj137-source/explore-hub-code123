-- Create call_sessions table for managing active calls
CREATE TABLE IF NOT EXISTS public.call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
  status TEXT NOT NULL CHECK (status IN ('initiating', 'ringing', 'active', 'ended', 'declined', 'missed')) DEFAULT 'initiating',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  answered_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(match_id, caller_id, receiver_id, started_at)
);

-- Create call_signals table for WebRTC signaling
CREATE TABLE IF NOT EXISTS public.call_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id UUID NOT NULL REFERENCES public.call_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate', 'end')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_sessions
CREATE POLICY "Users can view their own call sessions"
  ON public.call_sessions FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Premium users can create call sessions"
  ON public.call_sessions FOR INSERT
  WITH CHECK (
    auth.uid() = caller_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_premium = true
    )
  );

CREATE POLICY "Users can update their own call sessions"
  ON public.call_sessions FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- RLS Policies for call_signals
CREATE POLICY "Users can view signals for their calls"
  ON public.call_signals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.call_sessions
      WHERE id = call_signals.call_session_id
      AND (caller_id = auth.uid() OR receiver_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert signals for their calls"
  ON public.call_signals FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.call_sessions
      WHERE id = call_signals.call_session_id
      AND (caller_id = auth.uid() OR receiver_id = auth.uid())
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_call_sessions_match_id ON public.call_sessions(match_id);
CREATE INDEX idx_call_sessions_caller_id ON public.call_sessions(caller_id);
CREATE INDEX idx_call_sessions_receiver_id ON public.call_sessions(receiver_id);
CREATE INDEX idx_call_sessions_status ON public.call_sessions(status);
CREATE INDEX idx_call_signals_call_session_id ON public.call_signals(call_session_id);
CREATE INDEX idx_call_signals_created_at ON public.call_signals(created_at);

-- Function to cleanup old signals (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_old_call_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.call_signals
  WHERE created_at < NOW() - INTERVAL '5 minutes';
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.call_sessions TO authenticated;
GRANT SELECT, INSERT ON public.call_signals TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_call_signals() TO authenticated;

-- Add game_status and last_seen to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS game_status TEXT DEFAULT 'offline',
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- Create game_invites table for multiplayer invitations
CREATE TABLE IF NOT EXISTS game_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_game_invites_to_user ON game_invites(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_game_invites_from_user ON game_invites(from_user_id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_game_status ON profiles(game_status, last_seen);

-- Enable RLS
ALTER TABLE game_invites ENABLE ROW LEVEL SECURITY;

-- Enable Realtime for game_invites table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_invites'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_invites;
  END IF;
END $$;

-- RLS Policies for game_invites
DROP POLICY IF EXISTS "Users can view their own invites" ON game_invites;
DROP POLICY IF EXISTS "Users can view their own invites" ON game_invites;
DROP POLICY IF EXISTS "Users can view their own invites" ON game_invites;
CREATE POLICY "Users can view their own invites" 
  ON game_invites FOR SELECT 
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

DROP POLICY IF EXISTS "Users can send invites" ON game_invites;
DROP POLICY IF EXISTS "Users can send invites" ON game_invites;
DROP POLICY IF EXISTS "Users can send invites" ON game_invites;
CREATE POLICY "Users can send invites" 
  ON game_invites FOR INSERT 
  WITH CHECK (auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Users can update their received invites" ON game_invites;
DROP POLICY IF EXISTS "Users can update their received invites" ON game_invites;
DROP POLICY IF EXISTS "Users can update their received invites" ON game_invites;
CREATE POLICY "Users can update their received invites" 
  ON game_invites FOR UPDATE 
  USING (auth.uid() = to_user_id);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_game_invite_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS game_invites_updated_at ON game_invites;
CREATE TRIGGER game_invites_updated_at
  BEFORE UPDATE ON game_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_game_invite_updated_at();

-- Create function to expire old pending invites (older than 5 minutes)
CREATE OR REPLACE FUNCTION expire_old_game_invites()
RETURNS void AS $$
BEGIN
  UPDATE game_invites
  SET status = 'expired'
  WHERE status = 'pending' 
  AND created_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Message reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reactions on their messages" ON message_reactions;
DROP POLICY IF EXISTS "Users can view reactions on their messages" ON message_reactions;
CREATE POLICY "Users can view reactions on their messages"
  ON message_reactions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
CREATE POLICY "Users can add reactions"
  ON message_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their own reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can remove their own reactions" ON message_reactions;
CREATE POLICY "Users can remove their own reactions"
  ON message_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Online presence: add last_active column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_active TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Badge count column for cross-device sync
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'unread_badge_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN unread_badge_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Profile prompts table
CREATE TABLE IF NOT EXISTS profile_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, prompt)
);

ALTER TABLE profile_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view prompts" ON profile_prompts;
DROP POLICY IF EXISTS "Anyone can view prompts" ON profile_prompts;
CREATE POLICY "Anyone can view prompts"
  ON profile_prompts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can manage own prompts" ON profile_prompts;
DROP POLICY IF EXISTS "Users can manage own prompts" ON profile_prompts;
CREATE POLICY "Users can manage own prompts"
  ON profile_prompts FOR ALL
  USING (auth.uid() = user_id);

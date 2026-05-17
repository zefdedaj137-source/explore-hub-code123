-- Description: Ensure user_achievements table exists with correct permissions.
-- This is a repair migration — the original creation in 20260416000004 was
-- recorded as applied but the table may not have been physically created
-- (e.g. due to a partial transaction rollback). Using IF NOT EXISTS is safe.

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert achievements" ON user_achievements;
CREATE POLICY "System can insert achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON user_achievements TO authenticated;
GRANT SELECT, INSERT ON user_achievements TO service_role;

-- Signal PostgREST to reload its schema cache so grants take effect immediately
NOTIFY pgrst, 'reload schema';

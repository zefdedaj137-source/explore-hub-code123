-- Store dance video URLs in game_invites so Postgres realtime delivers them reliably
-- Pure broadcast is fire-and-forget; DB change events are guaranteed delivery

ALTER TABLE game_invites
  ADD COLUMN IF NOT EXISTS round1_video_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS round2_video_url TEXT DEFAULT NULL;

-- Allow participants to update video URLs on their own invite rows
DROP POLICY IF EXISTS "Participants can update video urls" ON game_invites;
CREATE POLICY "Participants can update video urls"
  ON game_invites FOR UPDATE
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id)
  WITH CHECK (auth.uid() = from_user_id OR auth.uid() = to_user_id);

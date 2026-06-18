-- Add missing 'action' column to likes table used by like_user RPC
-- The 20260612 migration introduced an 'action' column but it was never added to the table.

ALTER TABLE likes
  ADD COLUMN IF NOT EXISTS action TEXT NOT NULL DEFAULT 'like';

-- Also drop the ambiguous 3-param overload so Supabase always resolves to the
-- clean 2-param like_user(UUID,UUID) from 20260612000000.
DROP FUNCTION IF EXISTS like_user(UUID, UUID, BOOLEAN);

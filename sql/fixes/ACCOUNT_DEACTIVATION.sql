-- Add deactivation/scheduled deletion columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deactivated_at timestamptz DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS scheduled_deletion_at timestamptz DEFAULT NULL;

-- Index for efficient filtering of active profiles
CREATE INDEX IF NOT EXISTS idx_profiles_deactivated ON profiles (deactivated_at) WHERE deactivated_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_scheduled_deletion ON profiles (scheduled_deletion_at) WHERE scheduled_deletion_at IS NOT NULL;

-- Function to delete all user data (call via RPC from the client before signing out)
CREATE OR REPLACE FUNCTION delete_user_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete messages where user is sender or in a match they belong to
  DELETE FROM messages WHERE match_id IN (
    SELECT id FROM matches WHERE user1_id = p_user_id OR user2_id = p_user_id
  );

  -- Delete matches
  DELETE FROM matches WHERE user1_id = p_user_id OR user2_id = p_user_id;

  -- Delete likes (given and received)
  DELETE FROM likes WHERE liker_id = p_user_id OR liked_id = p_user_id;

  -- Delete reports (by and about user)
  DELETE FROM reports WHERE reporter_id = p_user_id OR reported_id = p_user_id;

  -- Delete profile
  DELETE FROM profiles WHERE id = p_user_id;

  -- Note: The auth.users row is NOT deleted here because the client
  -- cannot call admin.deleteUser. The user is signed out on the client side.
  -- A Supabase Edge Function or cron job with service_role key should
  -- periodically clean up orphaned auth.users entries.
END;
$$;

-- Function to deactivate account with a scheduled deletion date
CREATE OR REPLACE FUNCTION deactivate_account(p_user_id uuid, p_days integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_days < 1 OR p_days > 30 THEN
    RAISE EXCEPTION 'Deactivation period must be between 1 and 30 days';
  END IF;

  UPDATE profiles
  SET deactivated_at = now(),
      scheduled_deletion_at = now() + (p_days || ' days')::interval
  WHERE id = p_user_id;
END;
$$;

-- Function to reactivate account (cancel deactivation)
CREATE OR REPLACE FUNCTION reactivate_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET deactivated_at = NULL,
      scheduled_deletion_at = NULL
  WHERE id = p_user_id;
END;
$$;

-- Cron-compatible function: permanently delete accounts past their scheduled deletion date
-- Run this via pg_cron or a Supabase Edge Function on a daily schedule
CREATE OR REPLACE FUNCTION cleanup_expired_deactivations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM profiles
    WHERE scheduled_deletion_at IS NOT NULL
      AND scheduled_deletion_at <= now()
  LOOP
    PERFORM delete_user_account(r.id);
  END LOOP;
END;
$$;

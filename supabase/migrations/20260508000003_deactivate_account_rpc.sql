-- Description: Create deactivate_account RPC
-- Marks a profile as deactivated and schedules it for deletion after p_days days.
-- The user is signed out client-side after calling this.

-- Add columns to profiles if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.deactivate_account(
  p_user_id UUID,
  p_days INT DEFAULT 30
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only the authenticated user can deactivate their own account
  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE profiles
  SET
    deactivated_at = NOW(),
    scheduled_deletion_at = NOW() + (p_days || ' days')::INTERVAL
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deactivate_account(UUID, INT) TO authenticated;

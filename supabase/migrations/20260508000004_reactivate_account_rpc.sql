CREATE OR REPLACE FUNCTION public.reactivate_account(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE profiles
  SET deactivated_at = NULL,
      scheduled_deletion_at = NULL
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reactivate_account(UUID) TO authenticated;

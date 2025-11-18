-- REMOVE MATCH FUNCTION
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION remove_match(
  user_id UUID,
  other_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  match_exists BOOLEAN := FALSE;
BEGIN
  -- Validate input
  IF user_id IS NULL OR other_user_id IS NULL THEN
    RAISE EXCEPTION 'Both user IDs must be provided';
  END IF;
  
  IF user_id = other_user_id THEN
    RAISE EXCEPTION 'Users cannot unmatch themselves';
  END IF;
  
  -- Check if match exists and delete it
  DELETE FROM matches
  WHERE (user1_id = user_id AND user2_id = other_user_id)
     OR (user1_id = other_user_id AND user2_id = user_id);
  
  -- Check if any rows were affected
  IF FOUND THEN
    match_exists := TRUE;
    
    -- Also remove the likes between these users (optional - for clean slate)
    DELETE FROM likes
    WHERE (liker_id = user_id AND liked_id = other_user_id)
       OR (liker_id = other_user_id AND liked_id = user_id);
  END IF;
  
  RETURN match_exists;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION remove_match(UUID, UUID) TO authenticated;
-- CREATE LIKE AND CHECK MATCH FUNCTION
-- Run this AFTER running COMPLETE_SCHEMA_FIX.sql

CREATE OR REPLACE FUNCTION create_like_and_check_match(
  liker_user_id UUID,
  liked_user_id UUID
)
RETURNS TABLE(is_match BOOLEAN, match_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_like_id UUID;
  reverse_like_id UUID;
  new_match_id UUID;
BEGIN
  -- Validate input
  IF liker_user_id IS NULL OR liked_user_id IS NULL THEN
    RAISE EXCEPTION 'Both user IDs must be provided';
  END IF;
  
  IF liker_user_id = liked_user_id THEN
    RAISE EXCEPTION 'Users cannot like themselves';
  END IF;
  
  -- Check if the like already exists
  SELECT id INTO existing_like_id
  FROM likes
  WHERE liker_id = liker_user_id AND liked_id = liked_user_id;
  
  -- If like doesn't exist, create it
  IF existing_like_id IS NULL THEN
    INSERT INTO likes (liker_id, liked_id, action)
    VALUES (liker_user_id, liked_user_id, 'like')
    ON CONFLICT (liker_id, liked_id) DO NOTHING
    RETURNING id INTO existing_like_id;
  END IF;
  
  -- Check if there's a reverse like (mutual like)
  SELECT id INTO reverse_like_id
  FROM likes
  WHERE liker_id = liked_user_id AND liked_id = liker_user_id;
  
  -- If reverse like exists, create a match
  IF reverse_like_id IS NOT NULL THEN
    -- Check if match already exists
    SELECT id INTO new_match_id
    FROM matches
    WHERE (user1_id = liker_user_id AND user2_id = liked_user_id)
       OR (user1_id = liked_user_id AND user2_id = liker_user_id);
    
    -- If no match exists, create one
    IF new_match_id IS NULL THEN
      INSERT INTO matches (user1_id, user2_id)
      VALUES (
        LEAST(liker_user_id, liked_user_id),
        GREATEST(liker_user_id, liked_user_id)
      )
      ON CONFLICT (user1_id, user2_id) DO NOTHING
      RETURNING id INTO new_match_id;
    END IF;
    
    RETURN QUERY SELECT TRUE, COALESCE(new_match_id, (
      SELECT id FROM matches 
      WHERE (user1_id = liker_user_id AND user2_id = liked_user_id)
         OR (user1_id = liked_user_id AND user2_id = liker_user_id)
      LIMIT 1
    ));
  ELSE
    RETURN QUERY SELECT FALSE, NULL::UUID;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_like_and_check_match(UUID, UUID) TO authenticated;
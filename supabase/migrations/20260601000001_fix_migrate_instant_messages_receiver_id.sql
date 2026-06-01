-- Fix: migrate_instant_messages_to_match sets match_id but never clears
-- receiver_id, causing both to be non-null and violating the
-- messages_match_or_receiver_check constraint when a match forms.

CREATE OR REPLACE FUNCTION migrate_instant_messages_to_match(
  p_match_id  UUID,
  p_user1_id  UUID,
  p_user2_id  UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Re-parent all instant messages between these two users to the match chat.
  -- Also clear receiver_id so the constraint
  --   (match_id IS NOT NULL AND receiver_id IS NULL) OR
  --   (match_id IS NULL    AND receiver_id IS NOT NULL)
  -- continues to hold.
  UPDATE messages
  SET    match_id           = p_match_id,
         receiver_id        = NULL,
         is_instant_message = FALSE
  WHERE  is_instant_message = TRUE
    AND  (
           (sender_id = p_user1_id AND receiver_id = p_user2_id)
        OR (sender_id = p_user2_id AND receiver_id = p_user1_id)
         );

  -- Remove the instant_messages session record (no longer needed)
  DELETE FROM instant_messages
  WHERE  (sender_id = p_user1_id AND receiver_id = p_user2_id)
      OR (sender_id = p_user2_id AND receiver_id = p_user1_id);
END;
$$;

GRANT EXECUTE ON FUNCTION migrate_instant_messages_to_match(UUID, UUID, UUID) TO authenticated;

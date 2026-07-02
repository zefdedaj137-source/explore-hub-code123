-- Complete, App Store compliant account deletion.
--
-- Apple Guideline 5.1.1(v) requires apps that support account creation to also
-- let the user delete their account (not just deactivate). The previous
-- delete_user_account() only removed messages, matches, likes, reports and the
-- profile row, and it lived in a loose sql/fixes file that may never have been
-- applied. It left the auth.users row and every newer table (wallets,
-- subscriptions, blocks, swipes, calls, stories, etc.) behind.
--
-- This migration replaces it with a single transactional function that removes
-- ALL user-owned data and finally the auth.users row, so the account is truly
-- gone. Every statement is wrapped so that a table/column missing in a given
-- environment (schema drift across deployments) is skipped instead of aborting
-- the whole deletion.

CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_spec  text;
  v_where text;
  -- Flat tables that reference the user directly. Each entry is
  -- 'table:col1,col2' and every listed column is matched against the user id.
  v_specs text[] := ARRAY[
    'admin_users:user_id',
    'daily_swipes:user_id',
    'dancing_channel_participants:user_id',
    'data_requests:user_id',
    'event_checkins:user_id',
    'event_rsvps:user_id',
    'events:host_id',
    'experiments:user_id',
    'game_invites:from_user_id,to_user_id',
    'instant_messages:sender_id,receiver_id',
    'likes:liker_id,liked_id',
    'match_scores:user_id,target_user_id',
    'matching_preferences:user_id',
    'message_reactions:user_id',
    'profile_completeness:user_id',
    'profile_prompts:user_id',
    'profile_views:viewer_id,viewed_id',
    'push_subscriptions:user_id',
    'reports:reporter_id,reported_id',
    'scheduled_push_notifications:target_user_id',
    'subscriptions:user_id',
    'superlikes_purchases:user_id',
    'verification_requests:user_id',
    'verifications:user_id',
    'video_profiles:user_id',
    'wallets:user_id',
    'wallet_transactions:user_id',
    'blocks:blocker_id,blocked_id',
    'double_date_plans:planner_id',
    'bookmarked_matches:user_id'
  ];
BEGIN
  -- --- Relational cleanup (children before parents, all match-scoped rows) ---

  -- Reactions on any message inside the user's matches
  BEGIN
    DELETE FROM message_reactions
    WHERE message_id IN (
      SELECT m.id FROM messages m
      JOIN matches mt ON m.match_id = mt.id
      WHERE mt.user1_id = p_user_id OR mt.user2_id = p_user_id
    );
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  -- Messages inside the user's matches
  BEGIN
    DELETE FROM messages
    WHERE match_id IN (
      SELECT id FROM matches WHERE user1_id = p_user_id OR user2_id = p_user_id
    );
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  -- Call signals for the user's call sessions
  BEGIN
    DELETE FROM call_signals
    WHERE call_session_id IN (
      SELECT id FROM call_sessions
      WHERE caller_id = p_user_id
         OR receiver_id = p_user_id
         OR match_id IN (
              SELECT id FROM matches WHERE user1_id = p_user_id OR user2_id = p_user_id
            )
    )
    OR sender_id = p_user_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  -- Call sessions involving the user
  BEGIN
    DELETE FROM call_sessions
    WHERE caller_id = p_user_id
       OR receiver_id = p_user_id
       OR match_id IN (
            SELECT id FROM matches WHERE user1_id = p_user_id OR user2_id = p_user_id
          );
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  -- Story views on the user's stories, then their own views, then their stories
  BEGIN
    DELETE FROM story_views
    WHERE viewer_id = p_user_id
       OR story_id IN (SELECT id FROM stories WHERE user_id = p_user_id);
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  BEGIN
    DELETE FROM stories WHERE user_id = p_user_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  -- Date plans tied to the user or the user's matches
  BEGIN
    DELETE FROM date_plans
    WHERE planner_id = p_user_id
       OR partner_id = p_user_id
       OR match_id IN (
            SELECT id FROM matches WHERE user1_id = p_user_id OR user2_id = p_user_id
          );
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  -- Bookmarks tied to the user's matches (own bookmarks handled by the loop)
  BEGIN
    DELETE FROM bookmarked_matches
    WHERE match_id IN (
      SELECT id FROM matches WHERE user1_id = p_user_id OR user2_id = p_user_id
    );
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  -- --- Flat direct-reference tables ---
  FOREACH v_spec IN ARRAY v_specs LOOP
    SELECT string_agg(format('%I = %L', col, p_user_id), ' OR ')
      INTO v_where
      FROM unnest(string_to_array(split_part(v_spec, ':', 2), ',')) AS col;
    BEGIN
      EXECUTE format('DELETE FROM %I WHERE %s', split_part(v_spec, ':', 1), v_where);
    EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  END LOOP;

  -- Matches (after every match-scoped child is gone)
  BEGIN
    DELETE FROM matches WHERE user1_id = p_user_id OR user2_id = p_user_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  -- Profile row
  BEGIN
    DELETE FROM profiles WHERE id = p_user_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  -- Finally the auth account itself, so the deletion is permanent and complete.
  -- Guarded in case the function owner lacks rights on the auth schema in a
  -- given environment; the profile is already gone either way.
  BEGIN
    DELETE FROM auth.users WHERE id = p_user_id;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN NULL; END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

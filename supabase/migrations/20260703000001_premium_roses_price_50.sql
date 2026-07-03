-- ─────────────────────────────────────────────────────────────────────────────
-- Premium Roses: production pricing
-- Removes the test price (1 coin) and sets the real price to 50 coins per rose.
-- Everything stays atomic: balance check, like, match, deduction, and transaction
-- log all happen in a single locked DB call.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION send_premium_roses(
  p_user_id   UUID,
  p_target_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance      INTEGER;
  v_new_balance  INTEGER;
  v_match_id     UUID;
  v_u1           UUID;
  v_u2           UUID;
  v_cost         CONSTANT INTEGER := 50;
BEGIN
  IF p_user_id = p_target_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot rose yourself');
  END IF;

  v_u1 := LEAST(p_user_id, p_target_id);
  v_u2 := GREATEST(p_user_id, p_target_id);

  -- Already matched? Bail out before spending anything.
  SELECT id INTO v_match_id
  FROM matches
  WHERE user1_id = v_u1 AND user2_id = v_u2;

  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'already_matched', 'match_id', v_match_id);
  END IF;

  -- Lock wallet and verify funds
  SELECT balance INTO v_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_balance < v_cost THEN
    RETURN json_build_object('success', false, 'error', 'Not enough coins', 'balance', v_balance);
  END IF;

  -- Record the like (idempotent — Premium Roses bypasses the mutual-like rule)
  INSERT INTO likes (liker_id, liked_id, action)
  VALUES (p_user_id, p_target_id, 'like')
  ON CONFLICT (liker_id, liked_id)
  DO UPDATE SET action = 'like';

  -- Create the special match
  INSERT INTO matches (user1_id, user2_id, special_match_type)
  VALUES (v_u1, v_u2, 'premium_roses')
  ON CONFLICT (user1_id, user2_id) DO NOTHING
  RETURNING id INTO v_match_id;

  -- Race guard: another concurrent call may have just created it
  IF v_match_id IS NULL THEN
    SELECT id INTO v_match_id FROM matches WHERE user1_id = v_u1 AND user2_id = v_u2;
    RETURN json_build_object('success', false, 'error', 'already_matched', 'match_id', v_match_id);
  END IF;

  -- Deduct the rose cost
  UPDATE wallets
  SET balance = balance - v_cost,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO wallet_transactions (user_id, amount, type, item)
  VALUES (p_user_id, -v_cost, 'spend', 'premium_roses');

  -- Preserve any prior instant-message history in the new match chat
  PERFORM migrate_instant_messages_to_match(v_match_id, p_user_id, p_target_id);

  RETURN json_build_object('success', true, 'match_id', v_match_id, 'balance', v_new_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION send_premium_roses(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

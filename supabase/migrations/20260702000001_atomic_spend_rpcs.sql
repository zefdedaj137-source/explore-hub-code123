-- Atomic wallet-spend RPCs
-- Replaces the previous client-side "read balance → write balance" flows that
-- could grant free items (or lose coins) if the second call failed, and could
-- double-charge / double-match under rapid taps.
--
-- 1. activate_booster_paid  — spend coins + activate spotlight booster atomically
-- 2. send_premium_roses     — spend 1 coin + create instant match atomically

-- ─── 1. Paid booster activation (atomic) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION activate_booster_paid(
  p_user_id UUID,
  p_hours   INTEGER,
  p_cost    INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance     INTEGER;
  v_new_balance INTEGER;
BEGIN
  IF p_hours <= 0 OR p_cost < 0 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid booster request');
  END IF;

  -- Lock the wallet row so concurrent taps can't both pass the balance check
  SELECT balance INTO v_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_balance < p_cost THEN
    RETURN json_build_object('success', false, 'error', 'Not enough coins', 'balance', v_balance);
  END IF;

  -- Deduct coins
  UPDATE wallets
  SET balance = balance - p_cost,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  -- Activate / extend the booster
  UPDATE profiles
  SET booster_active = TRUE,
      booster_expires_at = GREATEST(COALESCE(booster_expires_at, now()), now())
                           + (p_hours || ' hours')::INTERVAL
  WHERE id = p_user_id;

  -- Record the spend
  INSERT INTO wallet_transactions (user_id, amount, type, item)
  VALUES (p_user_id, -p_cost, 'spend', 'boost_' || p_hours || 'h_bundle');

  RETURN json_build_object('success', true, 'balance', v_new_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION activate_booster_paid(UUID, INTEGER, INTEGER) TO authenticated;


-- ─── 2. Premium Roses instant match (atomic) ─────────────────────────────────
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

  IF v_balance < 1 THEN
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

  -- Deduct exactly one coin
  UPDATE wallets
  SET balance = balance - 1,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO wallet_transactions (user_id, amount, type, item)
  VALUES (p_user_id, -1, 'spend', 'premium_roses');

  -- Preserve any prior instant-message history in the new match chat
  PERFORM migrate_instant_messages_to_match(v_match_id, p_user_id, p_target_id);

  RETURN json_build_object('success', true, 'match_id', v_match_id, 'balance', v_new_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION send_premium_roses(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

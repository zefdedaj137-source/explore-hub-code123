-- Description: Add purchase_coins RPC for atomic wallet transactions
-- Created: 2026-04-16
-- Source: supabase_purchase_coins_rpc.sql (moved into migration system)

CREATE OR REPLACE FUNCTION purchase_coins(
  p_user_id UUID,
  p_pack_id TEXT,
  p_coins INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF p_coins <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid coin amount');
  END IF;

  -- Atomic increment with row lock
  UPDATE wallets
  SET balance = balance + p_coins,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, balance) VALUES (p_user_id, p_coins)
    RETURNING balance INTO v_new_balance;
  END IF;

  -- Record transaction
  INSERT INTO wallet_transactions (user_id, amount, type, item)
  VALUES (p_user_id, p_coins, 'purchase', p_pack_id);

  RETURN json_build_object('success', true, 'balance', v_new_balance);
END;
$$;

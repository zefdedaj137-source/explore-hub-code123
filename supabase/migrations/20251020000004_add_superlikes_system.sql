-- Add superlike tracking columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS superlikes_remaining INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_superlike_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create superlikes_purchases table to track purchases
CREATE TABLE IF NOT EXISTS superlikes_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  price_paid DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_superlikes_purchases_user_id ON superlikes_purchases(user_id);

-- Function to check and reset monthly superlikes for premium users
CREATE OR REPLACE FUNCTION reset_monthly_superlikes()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET 
    superlikes_remaining = 5,
    last_superlike_reset = NOW()
  WHERE 
    is_premium = true
    AND (
      last_superlike_reset IS NULL 
      OR last_superlike_reset < NOW() - INTERVAL '30 days'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to add purchased superlikes
CREATE OR REPLACE FUNCTION add_purchased_superlikes(
  p_user_id UUID,
  p_amount INTEGER,
  p_price DECIMAL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Record the purchase
  INSERT INTO superlikes_purchases (user_id, amount, price_paid)
  VALUES (p_user_id, p_amount, p_price);
  
  -- Add superlikes to user's account
  UPDATE profiles
  SET superlikes_remaining = COALESCE(superlikes_remaining, 0) + p_amount
  WHERE id = p_user_id;
  
  -- Return success with new balance
  SELECT json_build_object(
    'success', true,
    'superlikes_remaining', superlikes_remaining
  ) INTO v_result
  FROM profiles
  WHERE id = p_user_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to use a superlike
CREATE OR REPLACE FUNCTION use_superlike(
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_remaining INTEGER;
  v_result JSON;
BEGIN
  -- Get current superlikes
  SELECT superlikes_remaining INTO v_remaining
  FROM profiles
  WHERE id = p_user_id;
  
  -- Check if user has superlikes
  IF v_remaining IS NULL OR v_remaining <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No superlikes remaining',
      'superlikes_remaining', 0
    );
  END IF;
  
  -- Deduct one superlike
  UPDATE profiles
  SET superlikes_remaining = superlikes_remaining - 1
  WHERE id = p_user_id;
  
  -- Return success
  SELECT json_build_object(
    'success', true,
    'superlikes_remaining', superlikes_remaining
  ) INTO v_result
  FROM profiles
  WHERE id = p_user_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

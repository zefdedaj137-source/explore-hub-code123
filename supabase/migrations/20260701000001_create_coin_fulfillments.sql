-- Creates coin_fulfillments table used by fulfill-coins-purchase edge function
-- for idempotency (prevents double-crediting the same IAP transaction)

CREATE TABLE IF NOT EXISTS coin_fulfillments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  coins INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'apple_iap',
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE coin_fulfillments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own fulfillments"
  ON coin_fulfillments FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert (edge function uses service role key)
CREATE POLICY "service role can insert fulfillments"
  ON coin_fulfillments FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS coin_fulfillments_user_id_idx ON coin_fulfillments(user_id);
CREATE INDEX IF NOT EXISTS coin_fulfillments_idempotency_key_idx ON coin_fulfillments(idempotency_key);

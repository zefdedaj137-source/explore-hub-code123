-- Migration: Create coin_fulfillments table for idempotent coin pack fulfillment
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.coin_fulfillments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id       TEXT NOT NULL,
  coins            INTEGER NOT NULL,
  source           TEXT NOT NULL DEFAULT 'apple_iap', -- 'apple_iap' | 'stripe'
  idempotency_key  TEXT NOT NULL UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS coin_fulfillments_user_id_idx ON public.coin_fulfillments(user_id);

-- RLS: users can only read their own fulfillment records
ALTER TABLE public.coin_fulfillments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fulfillments"
  ON public.coin_fulfillments FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert (called from Edge Function with service role key)
-- No INSERT policy needed — Edge Functions use service role which bypasses RLS

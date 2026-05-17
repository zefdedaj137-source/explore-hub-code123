-- Add 'action' column to likes table if it doesn't exist
-- This enables persisting pass/dislike actions so users don't reappear

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'likes'
      AND column_name = 'action'
  ) THEN
    ALTER TABLE public.likes
      ADD COLUMN action TEXT NOT NULL DEFAULT 'like'
      CHECK (action IN ('like', 'pass'));
  END IF;
END $$;

-- Notify PostgREST to reload schema so the new column is visible via API
NOTIFY pgrst, 'reload schema';

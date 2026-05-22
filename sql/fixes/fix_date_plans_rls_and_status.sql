-- Fix 1: Add 'expired' to the status CHECK constraint
-- (the original migration was missing it, so UPDATE status='expired' fails silently)
ALTER TABLE date_plans
  DROP CONSTRAINT IF EXISTS date_plans_status_check;

ALTER TABLE date_plans
  ADD CONSTRAINT date_plans_status_check
  CHECK (status IN ('proposed', 'confirmed', 'completed', 'canceled', 'expired'));

-- Fix 2: Re-enable RLS and re-apply SELECT / INSERT / UPDATE policies
-- (run this if you see other users' plans — it means the policies were never applied)
ALTER TABLE date_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can view their date plans" ON date_plans;
CREATE POLICY "users can view their date plans"
  ON date_plans FOR SELECT
  USING (auth.uid() = planner_id OR auth.uid() = partner_id);

DROP POLICY IF EXISTS "users can create their date plans" ON date_plans;
CREATE POLICY "users can create their date plans"
  ON date_plans FOR INSERT
  WITH CHECK (auth.uid() = planner_id);

DROP POLICY IF EXISTS "users can update their date plans" ON date_plans;
CREATE POLICY "users can update their date plans"
  ON date_plans FOR UPDATE
  USING (auth.uid() = planner_id OR auth.uid() = partner_id);

-- Enable realtime for this table (safe — skips if already a member)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'date_plans'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE date_plans;
  END IF;
END $$;

-- Description: Auto-suspend users after 3+ reports; add incognito_mode column
-- Created: 2026-04-16

-- Incognito mode column for profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS incognito_mode BOOLEAN NOT NULL DEFAULT false;

-- Notification preferences columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_matches BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_messages BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_likes BOOLEAN NOT NULL DEFAULT true;

-- Auto-suspend function: triggered on each new report
CREATE OR REPLACE FUNCTION check_report_threshold()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM reports
  WHERE reported_user_id = NEW.reported_user_id
    AND created_at > NOW() - INTERVAL '30 days';

  IF v_count >= 3 THEN
    UPDATE profiles
    SET deactivated_at = NOW()
    WHERE id = NEW.reported_user_id
      AND deactivated_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on reports table
DROP TRIGGER IF EXISTS trg_check_report_threshold ON reports;
CREATE TRIGGER trg_check_report_threshold
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION check_report_threshold();

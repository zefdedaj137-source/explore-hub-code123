-- Auto-expire proposed date plans whose scheduled time has passed.
-- Runs as a Postgres function callable from a pg_cron job or manually.
-- The client also calls the update on page load as a belt-and-suspenders guard.

create or replace function expire_past_date_plans()
returns void
language sql
security definer
as $$
  update date_plans
  set status = 'expired'
  where status = 'proposed'
    and scheduled_for < now();

  update double_date_plans
  set status = 'expired'
  where status = 'proposed'
    and scheduled_for < now();
$$;

-- If pg_cron is enabled on your Supabase project, schedule this to run hourly:
-- select cron.schedule('expire-date-plans', '0 * * * *', 'select expire_past_date_plans()');

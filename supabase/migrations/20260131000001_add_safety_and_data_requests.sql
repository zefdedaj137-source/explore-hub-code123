-- Safety reports
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  reported_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  details text,
  created_at timestamptz not null default now()
);

alter table reports enable row level security;

DROP POLICY IF EXISTS "reporter can insert reports" ON reports;
DROP POLICY IF EXISTS "reporter can insert reports" ON reports;
create policy "reporter can insert reports"
  on reports for insert
  with check (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reporter can view own reports" ON reports;
DROP POLICY IF EXISTS "reporter can view own reports" ON reports;
create policy "reporter can view own reports"
  on reports for select
  using (auth.uid() = reporter_id);

-- Data export / delete requests
create table if not exists data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  request_type text not null check (request_type in ('export', 'delete')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'rejected')),
  notes text,
  created_at timestamptz not null default now()
);

alter table data_requests enable row level security;

DROP POLICY IF EXISTS "user can create own data requests" ON data_requests;
DROP POLICY IF EXISTS "user can create own data requests" ON data_requests;
create policy "user can create own data requests"
  on data_requests for insert
  with check (auth.uid() = user_id);

DROP POLICY IF EXISTS "user can view own data requests" ON data_requests;
DROP POLICY IF EXISTS "user can view own data requests" ON data_requests;
create policy "user can view own data requests"
  on data_requests for select
  using (auth.uid() = user_id);

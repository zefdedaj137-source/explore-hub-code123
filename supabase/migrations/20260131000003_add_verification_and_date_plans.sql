-- Verification requests
create table if not exists verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  selfie_url text,
  id_url text,
  notes text,
  created_at timestamptz not null default now()
);

alter table verification_requests enable row level security;

DROP POLICY IF EXISTS "user can create own verification requests" ON verification_requests;
DROP POLICY IF EXISTS "user can create own verification requests" ON verification_requests;
create policy "user can create own verification requests"
  on verification_requests for insert
  with check (auth.uid() = user_id);

DROP POLICY IF EXISTS "user can view own verification requests" ON verification_requests;
DROP POLICY IF EXISTS "user can view own verification requests" ON verification_requests;
create policy "user can view own verification requests"
  on verification_requests for select
  using (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin can view all verification requests" ON verification_requests;
DROP POLICY IF EXISTS "admin can view all verification requests" ON verification_requests;
create policy "admin can view all verification requests"
  on verification_requests for select
  using (exists (select 1 from admin_users where user_id = auth.uid()));

DROP POLICY IF EXISTS "admin can update verification requests" ON verification_requests;
DROP POLICY IF EXISTS "admin can update verification requests" ON verification_requests;
create policy "admin can update verification requests"
  on verification_requests for update
  using (exists (select 1 from admin_users where user_id = auth.uid()));

-- Date plans
create table if not exists date_plans (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  planner_id uuid not null references profiles(id) on delete cascade,
  partner_id uuid not null references profiles(id) on delete cascade,
  scheduled_for timestamptz not null,
  location text not null,
  notes text,
  status text not null default 'proposed' check (status in ('proposed','confirmed','completed','canceled')),
  created_at timestamptz not null default now()
);

alter table date_plans enable row level security;

DROP POLICY IF EXISTS "users can view their date plans" ON date_plans;
DROP POLICY IF EXISTS "users can view their date plans" ON date_plans;
create policy "users can view their date plans"
  on date_plans for select
  using (auth.uid() = planner_id or auth.uid() = partner_id);

DROP POLICY IF EXISTS "users can create their date plans" ON date_plans;
DROP POLICY IF EXISTS "users can create their date plans" ON date_plans;
create policy "users can create their date plans"
  on date_plans for insert
  with check (auth.uid() = planner_id);

DROP POLICY IF EXISTS "users can update their date plans" ON date_plans;
DROP POLICY IF EXISTS "users can update their date plans" ON date_plans;
create policy "users can update their date plans"
  on date_plans for update
  using (auth.uid() = planner_id or auth.uid() = partner_id);

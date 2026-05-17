-- Double date plans
create table if not exists double_date_plans (
  id uuid primary key default gen_random_uuid(),
  planner_id uuid not null references profiles(id) on delete cascade,
  partner1_id uuid not null references profiles(id) on delete cascade,
  partner2_id uuid not null references profiles(id) on delete cascade,
  scheduled_for timestamptz not null,
  location text not null,
  notes text,
  status text not null default 'proposed' check (status in ('proposed','confirmed','completed','canceled')),
  created_at timestamptz not null default now()
);

alter table double_date_plans enable row level security;

DROP POLICY IF EXISTS "users can view their double date plans" ON double_date_plans;
DROP POLICY IF EXISTS "users can view their double date plans" ON double_date_plans;
create policy "users can view their double date plans"
  on double_date_plans for select
  using (auth.uid() = planner_id or auth.uid() = partner1_id or auth.uid() = partner2_id);

DROP POLICY IF EXISTS "users can create their double date plans" ON double_date_plans;
DROP POLICY IF EXISTS "users can create their double date plans" ON double_date_plans;
create policy "users can create their double date plans"
  on double_date_plans for insert
  with check (auth.uid() = planner_id);

DROP POLICY IF EXISTS "users can update their double date plans" ON double_date_plans;
DROP POLICY IF EXISTS "users can update their double date plans" ON double_date_plans;
create policy "users can update their double date plans"
  on double_date_plans for update
  using (auth.uid() = planner_id or auth.uid() = partner1_id or auth.uid() = partner2_id);

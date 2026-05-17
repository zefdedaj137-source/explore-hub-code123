-- Scheduled push notifications
create table if not exists scheduled_push_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  url text,
  target_user_id uuid references profiles(id) on delete set null,
  send_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table scheduled_push_notifications enable row level security;

DROP POLICY IF EXISTS "admin can manage scheduled push" ON scheduled_push_notifications;
DROP POLICY IF EXISTS "admin can manage scheduled push" ON scheduled_push_notifications;
create policy "admin can manage scheduled push"
  on scheduled_push_notifications for all
  using (exists (select 1 from admin_users where user_id = auth.uid()))
  with check (exists (select 1 from admin_users where user_id = auth.uid()));

-- Events
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  location text not null,
  scheduled_for timestamptz not null,
  capacity integer,
  created_at timestamptz not null default now()
);

alter table events enable row level security;

DROP POLICY IF EXISTS "users can view events" ON events;
DROP POLICY IF EXISTS "users can view events" ON events;
create policy "users can view events"
  on events for select
  using (true);

DROP POLICY IF EXISTS "users can create events" ON events;
DROP POLICY IF EXISTS "users can create events" ON events;
create policy "users can create events"
  on events for insert
  with check (auth.uid() = host_id);

DROP POLICY IF EXISTS "hosts can update events" ON events;
DROP POLICY IF EXISTS "hosts can update events" ON events;
create policy "hosts can update events"
  on events for update
  using (auth.uid() = host_id);

-- Event RSVPs
create table if not exists event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'interested' check (status in ('going','interested','not_going')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table event_rsvps enable row level security;

DROP POLICY IF EXISTS "users can manage their event rsvps" ON event_rsvps;
DROP POLICY IF EXISTS "users can manage their event rsvps" ON event_rsvps;
create policy "users can manage their event rsvps"
  on event_rsvps for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

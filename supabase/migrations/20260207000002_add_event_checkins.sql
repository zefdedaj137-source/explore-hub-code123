-- Event check-ins
create table if not exists event_checkins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  photo_url text not null,
  created_at timestamptz not null default now()
);

alter table event_checkins enable row level security;

DROP POLICY IF EXISTS "users can manage their event checkins" ON event_checkins;
DROP POLICY IF EXISTS "users can manage their event checkins" ON event_checkins;
create policy "users can manage their event checkins"
  on event_checkins for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

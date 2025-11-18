-- Create profile_views table to track who viewed whose profile
create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  -- Prevent duplicate entries for the same viewer/viewed pair within a short time
  constraint profile_views_unique_recent unique (viewer_id, viewed_id)
);

-- Indexes for faster lookup
create index if not exists idx_profile_views_viewer on public.profile_views(viewer_id);
create index if not exists idx_profile_views_viewed on public.profile_views(viewed_id);
create index if not exists idx_profile_views_viewed_at on public.profile_views(viewed_at desc);

-- Enable RLS
alter table public.profile_views enable row level security;

-- Policies:
-- Insert: authenticated users can record profile views (when they view someone)
create policy profile_views_insert on public.profile_views
  for insert
  to authenticated
  with check (auth.uid() = viewer_id);

-- Select: users can only see who viewed their profile (not who they viewed)
create policy profile_views_select_own on public.profile_views
  for select
  to authenticated
  using (auth.uid() = viewed_id);

-- Delete: users can delete views on their own profile (privacy)
create policy profile_views_delete_own on public.profile_views
  for delete
  to authenticated
  using (auth.uid() = viewed_id);

-- Optional: Function to upsert profile views (update timestamp if already exists)
create or replace function public.record_profile_view(p_viewer_id uuid, p_viewed_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Don't record if viewing own profile
  if p_viewer_id = p_viewed_id then
    return;
  end if;

  -- Insert or update the view timestamp
  insert into public.profile_views (viewer_id, viewed_id, viewed_at)
  values (p_viewer_id, p_viewed_id, now())
  on conflict (viewer_id, viewed_id)
  do update set viewed_at = now();
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.record_profile_view(uuid, uuid) to authenticated;

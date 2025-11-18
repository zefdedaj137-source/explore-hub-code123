-- Create blocks table
create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocks_unique_pair unique (blocker_id, blocked_id)
);

-- Indexes for faster lookup
create index if not exists idx_blocks_blocker on public.blocks(blocker_id);
create index if not exists idx_blocks_blocked on public.blocks(blocked_id);

-- Enable RLS
alter table public.blocks enable row level security;

-- Policies:
-- Insert: a user can create a block where they are the blocker
create policy blocks_insert_self on public.blocks
  for insert
  to authenticated
  with check (auth.uid() = blocker_id);

-- Select: a user can see any blocks where they are the blocker or the blocked
create policy blocks_select_self on public.blocks
  for select
  to authenticated
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

-- Delete: only blocker can delete (unblock)
create policy blocks_delete_self on public.blocks
  for delete
  to authenticated
  using (auth.uid() = blocker_id);

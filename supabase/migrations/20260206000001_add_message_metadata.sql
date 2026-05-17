-- Add missing message metadata columns
alter table public.messages
  add column if not exists receiver_id uuid references public.profiles(id) on delete set null,
  add column if not exists voice_url text,
  add column if not exists read_at timestamptz,
  add column if not exists is_instant_message boolean default false;

create index if not exists idx_messages_read_at on public.messages(read_at) where read_at is null;

-- Allow participants to update messages (read receipts)
drop policy if exists "Users can update messages in their matches" on public.messages;
create policy "Users can update messages in their matches"
  on public.messages for update
  using (
    exists (
      select 1 from public.matches
      where matches.id = messages.match_id
      and (matches.user1_id = auth.uid() or matches.user2_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.matches
      where matches.id = messages.match_id
      and (matches.user1_id = auth.uid() or matches.user2_id = auth.uid())
    )
  );

-- Enforce blocking across chat and calls via RLS policies
-- Enable RLS on target tables (idempotent)
alter table if exists public.messages enable row level security;
alter table if exists public.call_sessions enable row level security;
alter table if exists public.call_signals enable row level security;

-- Messages: prevent sending if either side has blocked the other
drop policy if exists messages_insert_no_block on public.messages;
create policy messages_insert_no_block on public.messages
  for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and not exists (
      select 1
      from public.matches m
      join public.blocks b
        on (
          b.blocker_id = auth.uid()
          and b.blocked_id = (case when m.user1_id = auth.uid() then m.user2_id else m.user1_id end)
        )
        or (
          b.blocker_id = (case when m.user1_id = auth.uid() then m.user2_id else m.user1_id end)
          and b.blocked_id = auth.uid()
        )
      where m.id = public.messages.match_id
    )
  );

-- Call sessions: prevent creating a session if either side has blocked the other
drop policy if exists call_sessions_insert_no_block on public.call_sessions;
create policy call_sessions_insert_no_block on public.call_sessions
  for insert
  to authenticated
  with check (
    auth.uid() = caller_id
    and not exists (
      select 1
      from public.blocks b
      where (b.blocker_id = caller_id and b.blocked_id = receiver_id)
         or (b.blocker_id = receiver_id and b.blocked_id = caller_id)
    )
  );

-- Call signals: prevent signaling if participants are blocked; and require sender to belong to the session
-- Also prevents stray senders from writing to a session they don't belong to
drop policy if exists call_signals_insert_no_block on public.call_signals;
create policy call_signals_insert_no_block on public.call_signals
  for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.call_sessions s
      where s.id = public.call_signals.call_session_id
        and (public.call_signals.sender_id = s.caller_id or public.call_signals.sender_id = s.receiver_id)
    )
    and not exists (
      select 1
      from public.call_sessions s
      join public.blocks b
        on (b.blocker_id = s.caller_id and b.blocked_id = s.receiver_id)
        or (b.blocker_id = s.receiver_id and b.blocked_id = s.caller_id)
      where s.id = public.call_signals.call_session_id
    )
  );

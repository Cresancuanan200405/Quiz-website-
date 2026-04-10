-- Ensure matched queue rows remain readable for handshake and surrender sync polling.
-- Safe to run multiple times.

alter table if exists public.app_battle_queue enable row level security;

drop policy if exists "Battle queue is readable" on public.app_battle_queue;
create policy "Battle queue is readable"
  on public.app_battle_queue
  for select
  to anon, authenticated
  using (true);

-- Live 1v1 queue table for mode/category-scoped matchmaking.
-- Safe to run multiple times.

create table if not exists public.app_battle_queue (
  profile_key text primary key,
  mode text not null,
  category text not null,
  display_name text not null,
  tier text not null default 'Rookie',
  avatar_type text not null default 'initials',
  avatar_value text not null default 'PL',
  searching boolean not null default true,
  joined_at timestamptz not null default now(),
  heartbeat_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_battle_queue_avatar_type_check check (avatar_type in ('initials', 'icon', 'image'))
);

create index if not exists app_battle_queue_mode_category_idx
  on public.app_battle_queue (mode, category);

create index if not exists app_battle_queue_heartbeat_idx
  on public.app_battle_queue (heartbeat_at desc);

create or replace function public.app_battle_queue_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_battle_queue_set_updated_at on public.app_battle_queue;
create trigger app_battle_queue_set_updated_at
before update on public.app_battle_queue
for each row
execute function public.app_battle_queue_set_updated_at();

alter table public.app_battle_queue enable row level security;

drop policy if exists "Battle queue is readable" on public.app_battle_queue;
create policy "Battle queue is readable"
  on public.app_battle_queue
  for select
  to anon, authenticated
  using (searching = true);

drop policy if exists "Battle queue is insertable" on public.app_battle_queue;
create policy "Battle queue is insertable"
  on public.app_battle_queue
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Battle queue is updatable" on public.app_battle_queue;
create policy "Battle queue is updatable"
  on public.app_battle_queue
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Battle queue is deletable" on public.app_battle_queue;
create policy "Battle queue is deletable"
  on public.app_battle_queue
  for delete
  to anon, authenticated
  using (true);

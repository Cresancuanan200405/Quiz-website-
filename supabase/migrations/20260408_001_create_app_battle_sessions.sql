-- 1v1 battle persistence + settings compatibility
-- Safe to run multiple times.

-- Ensure settings column used by the app exists.
alter table if exists public.app_user_profiles
  add column if not exists next_question_delay_seconds integer not null default 3;

-- Keep values in valid UI range.
alter table if exists public.app_user_profiles
  drop constraint if exists app_user_profiles_next_question_delay_seconds_check;

alter table if exists public.app_user_profiles
  add constraint app_user_profiles_next_question_delay_seconds_check
  check (next_question_delay_seconds between 1 and 10);

-- Create table for battle session history.
create table if not exists public.app_battle_sessions (
  id bigserial primary key,
  profile_key text not null,
  mode text not null,
  category text not null,
  result text not null check (result in ('win', 'loss', 'draw')),
  user_score integer not null default 0,
  opponent_score integer not null default 0,
  opponent_name text not null,
  played_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists app_battle_sessions_profile_key_idx
  on public.app_battle_sessions (profile_key);

create index if not exists app_battle_sessions_played_at_idx
  on public.app_battle_sessions (played_at desc);

-- RLS for browser client access.
alter table public.app_battle_sessions enable row level security;

drop policy if exists "Battle sessions are readable" on public.app_battle_sessions;
create policy "Battle sessions are readable"
  on public.app_battle_sessions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Battle sessions are insertable" on public.app_battle_sessions;
create policy "Battle sessions are insertable"
  on public.app_battle_sessions
  for insert
  to anon, authenticated
  with check (true);

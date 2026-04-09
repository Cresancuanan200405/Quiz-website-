-- Trivia Journey session persistence for real leaderboard aggregation.
-- Safe to run multiple times.

create table if not exists public.app_quiz_sessions (
  id bigserial primary key,
  profile_key text not null,
  category text not null,
  difficulty text not null,
  question_count integer not null default 0,
  correct integer not null default 0,
  total integer not null default 0,
  passed boolean not null default false,
  best_streak integer not null default 0,
  points integer not null default 0,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists app_quiz_sessions_profile_key_idx
  on public.app_quiz_sessions (profile_key);

create index if not exists app_quiz_sessions_completed_at_idx
  on public.app_quiz_sessions (completed_at desc);

alter table public.app_quiz_sessions enable row level security;

drop policy if exists "Quiz sessions are readable" on public.app_quiz_sessions;
create policy "Quiz sessions are readable"
  on public.app_quiz_sessions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Quiz sessions are insertable" on public.app_quiz_sessions;
create policy "Quiz sessions are insertable"
  on public.app_quiz_sessions
  for insert
  to anon, authenticated
  with check (true);

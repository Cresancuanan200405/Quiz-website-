-- Shared battle questions table for synchronized question sets across both players.
-- Safe to run multiple times.

create table if not exists public.app_battle_questions (
  match_token text primary key,
  questions jsonb not null,
  category text not null,
  mode text not null,
  question_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_battle_questions_created_at_idx
  on public.app_battle_questions (created_at desc);

alter table public.app_battle_questions enable row level security;

drop policy if exists "Battle questions are readable by authenticated" on public.app_battle_questions;
create policy "Battle questions are readable by authenticated"
  on public.app_battle_questions
  for select
  to authenticated
  using (true);

drop policy if exists "Battle questions are insertable" on public.app_battle_questions;
create policy "Battle questions are insertable"
  on public.app_battle_questions
  for insert
  to authenticated
  with check (true);

drop policy if exists "Battle questions are deletable" on public.app_battle_questions;
create policy "Battle questions are deletable"
  on public.app_battle_questions
  for delete
  to authenticated
  using (true);

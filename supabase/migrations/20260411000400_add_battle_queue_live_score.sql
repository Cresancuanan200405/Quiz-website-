-- Live in-match score synchronization for 1v1 battle.
-- Safe to run multiple times.

alter table if exists public.app_battle_queue
  add column if not exists live_score integer not null default 0;

-- Live accuracy and streak synchronization for opponent stats during 1v1 battle.
-- Safe to run multiple times.

alter table if exists public.app_battle_queue
  add column if not exists live_accuracy integer not null default 0;

alter table if exists public.app_battle_queue
  add column if not exists live_streak integer not null default 0;

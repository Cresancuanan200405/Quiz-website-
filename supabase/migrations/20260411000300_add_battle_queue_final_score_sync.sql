-- Final score synchronization for 1v1 result resolution.
-- Safe to run multiple times.

alter table if exists public.app_battle_queue
  add column if not exists final_score integer;

alter table if exists public.app_battle_queue
  add column if not exists finished_at timestamptz;

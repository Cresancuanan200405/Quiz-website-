-- Track when each battle client has loaded the shared match questions.
-- Safe to run multiple times.

alter table if exists public.app_battle_queue
  add column if not exists match_ready_at timestamptz;

create index if not exists app_battle_queue_match_ready_idx
  on public.app_battle_queue (match_token, match_ready_at desc);
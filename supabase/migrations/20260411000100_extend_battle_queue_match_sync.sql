-- Extend battle queue for synchronized match start and surrender propagation.
-- Safe to run multiple times.

alter table if exists public.app_battle_queue
  add column if not exists queue_state text not null default 'searching';

alter table if exists public.app_battle_queue
  add column if not exists match_token text;

alter table if exists public.app_battle_queue
  add column if not exists match_starts_at timestamptz;

alter table if exists public.app_battle_queue
  add column if not exists opponent_profile_key text;

alter table if exists public.app_battle_queue
  add column if not exists opponent_display_name text;

alter table if exists public.app_battle_queue
  add column if not exists opponent_tier text;

alter table if exists public.app_battle_queue
  add column if not exists opponent_avatar_type text;

alter table if exists public.app_battle_queue
  add column if not exists opponent_avatar_value text;

alter table if exists public.app_battle_queue
  add column if not exists surrendered boolean not null default false;

alter table if exists public.app_battle_queue
  add column if not exists surrendered_by_profile_key text;

alter table if exists public.app_battle_queue
  drop constraint if exists app_battle_queue_state_check;

alter table if exists public.app_battle_queue
  add constraint app_battle_queue_state_check
  check (queue_state in ('searching', 'matched'));

create index if not exists app_battle_queue_match_token_idx
  on public.app_battle_queue (match_token);

create index if not exists app_battle_queue_state_idx
  on public.app_battle_queue (queue_state);

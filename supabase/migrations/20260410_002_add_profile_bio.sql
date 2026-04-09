-- Profile bio support for editable user profile information.
-- Safe to run multiple times.

alter table if exists public.app_user_profiles
  add column if not exists bio text not null default '';

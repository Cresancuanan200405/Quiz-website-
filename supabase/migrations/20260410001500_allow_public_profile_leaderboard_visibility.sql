-- Allow authenticated users to read public profiles so leaderboards can show other players.
-- Owners always retain visibility to their own profile row.

alter table if exists public.app_user_profiles
  enable row level security;

drop policy if exists app_user_profiles_public_or_owner_select on public.app_user_profiles;
create policy app_user_profiles_public_or_owner_select
  on public.app_user_profiles
  for select
  to authenticated
  using (
    coalesce(public_profile, false)
    or auth.uid()::text = profile_key
  );

-- Lock down unrestricted public tables and ensure app profile data is owner-scoped.
-- Safe to run multiple times.

-- app_user_profiles was previously public-read/public-write.
alter table if exists public.app_user_profiles
  enable row level security;

drop policy if exists app_user_profiles_public_read on public.app_user_profiles;
drop policy if exists app_user_profiles_public_write on public.app_user_profiles;

drop policy if exists app_user_profiles_owner_select on public.app_user_profiles;
create policy app_user_profiles_owner_select
  on public.app_user_profiles
  for select
  to authenticated
  using (auth.uid()::text = profile_key);

drop policy if exists app_user_profiles_owner_insert on public.app_user_profiles;
create policy app_user_profiles_owner_insert
  on public.app_user_profiles
  for insert
  to authenticated
  with check (auth.uid()::text = profile_key);

drop policy if exists app_user_profiles_owner_update on public.app_user_profiles;
create policy app_user_profiles_owner_update
  on public.app_user_profiles
  for update
  to authenticated
  using (auth.uid()::text = profile_key)
  with check (auth.uid()::text = profile_key);

drop policy if exists app_user_profiles_owner_delete on public.app_user_profiles;
create policy app_user_profiles_owner_delete
  on public.app_user_profiles
  for delete
  to authenticated
  using (auth.uid()::text = profile_key);

-- These tables had RLS disabled, which left them unrestricted.
alter table if exists public.achievements
  enable row level security;

drop policy if exists achievements_authenticated_read on public.achievements;
create policy achievements_authenticated_read
  on public.achievements
  for select
  to authenticated
  using (true);

alter table if exists public.categories
  enable row level security;

drop policy if exists categories_authenticated_read on public.categories;
create policy categories_authenticated_read
  on public.categories
  for select
  to authenticated
  using (true);

alter table if exists public.questions
  enable row level security;

drop policy if exists questions_authenticated_read on public.questions;
create policy questions_authenticated_read
  on public.questions
  for select
  to authenticated
  using (true);

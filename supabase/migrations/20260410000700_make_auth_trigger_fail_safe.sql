-- Ensure auth signup never fails because of profile mirror writes.
-- Safe to run multiple times.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  raw_username text;
  base_slug text;
  suffix text;
  candidate_username text;
  final_username text;
  final_handle text;
  avatar_seed text;
begin
  raw_username := coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), 'player');

  base_slug := lower(regexp_replace(raw_username, '[^a-zA-Z0-9_-]', '', 'g'));
  if base_slug = '' then
    base_slug := 'player';
  end if;

  if char_length(base_slug) < 2 then
    base_slug := rpad(base_slug, 2, 'x');
  end if;

  base_slug := left(base_slug, 50);
  suffix := '_' || left(replace(new.id::text, '-', ''), 6);
  candidate_username := base_slug;

  if exists (
    select 1
    from public.profiles p
    where p.username = candidate_username
      and p.id <> new.id
  ) then
    candidate_username := left(base_slug, greatest(2, 50 - char_length(suffix))) || suffix;
  end if;

  final_username := left(candidate_username, 50);
  final_handle := '@' || final_username;

  if exists (
    select 1
    from public.profiles p
    where p.handle = final_handle
      and p.id <> new.id
  ) then
    final_username := left(base_slug, greatest(2, 50 - char_length(suffix))) || suffix;
    final_handle := '@' || final_username;
  end if;

  avatar_seed := upper(left(regexp_replace(raw_username, '\s+', '', 'g'), 2));
  if avatar_seed = '' then
    avatar_seed := 'PL';
  end if;

  begin
    insert into public.profiles (id, username, handle, tier)
    values (new.id, final_username, final_handle, 'Rising')
    on conflict (id) do update
      set username = excluded.username,
          handle = excluded.handle,
          updated_at = now();
  exception
    when others then
      raise warning 'handle_new_auth_user profiles sync failed for %: %', new.id, sqlerrm;
  end;

  begin
    insert into public.app_user_profiles (
      profile_key,
      display_name,
      handle,
      bio,
      tier,
      tags,
      avatar_type,
      avatar_value,
      public_profile,
      show_online_status,
      sound_effects,
      music,
      auto_start_next_quiz,
      next_question_delay_seconds,
      daily_reminder,
      challenge_alerts,
      email_notifications,
      default_language,
      preferred_difficulty,
      updated_at
    )
    values (
      new.id::text,
      final_username,
      final_handle,
      'Curious challenger exploring trivia and strategy one round at a time.',
      'Rising',
      '[]'::jsonb,
      'initials',
      avatar_seed,
      true,
      true,
      true,
      false,
      true,
      3,
      true,
      true,
      false,
      'English',
      'Medium',
      now()
    )
    on conflict (profile_key) do update
      set display_name = excluded.display_name,
          handle = excluded.handle,
          updated_at = now();
  exception
    when others then
      raise warning 'handle_new_auth_user app_user_profiles sync failed for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

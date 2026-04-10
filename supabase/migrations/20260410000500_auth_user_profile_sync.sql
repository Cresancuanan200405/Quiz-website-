-- Keep profile tables in sync with Supabase Auth users.
-- Safe to run multiple times.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  base_username text;
  safe_handle text;
  avatar_seed text;
begin
  base_username := coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), 'player');
  safe_handle := '@' || regexp_replace(lower(base_username), '[^a-z0-9_-]', '', 'g');

  if safe_handle = '@' then
    safe_handle := '@player';
  end if;

  avatar_seed := upper(left(regexp_replace(base_username, '\s+', '', 'g'), 2));
  if avatar_seed = '' then
    avatar_seed := 'PL';
  end if;

  insert into public.profiles (id, username, handle, tier)
  values (new.id, base_username, safe_handle, 'Rising')
  on conflict (id) do update
    set username = excluded.username,
        handle = excluded.handle,
        updated_at = now();

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
    base_username,
    safe_handle,
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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_auth_user();

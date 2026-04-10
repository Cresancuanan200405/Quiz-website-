-- Allow authenticated users to permanently delete their own account and data.

create or replace function public.app_delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if to_regclass('public.app_quiz_sessions') is not null then
    delete from public.app_quiz_sessions where profile_key = v_user_id::text;
  end if;

  if to_regclass('public.app_battle_sessions') is not null then
    delete from public.app_battle_sessions where profile_key = v_user_id::text;
  end if;

  if to_regclass('public.quiz_answers') is not null then
    delete from public.quiz_answers where profile_id = v_user_id;
  end if;

  if to_regclass('public.quiz_sessions') is not null then
    delete from public.quiz_sessions where profile_id = v_user_id;
  end if;

  if to_regclass('public.saved_facts') is not null then
    delete from public.saved_facts where profile_id = v_user_id;
  end if;

  if to_regclass('public.profile_tags') is not null then
    delete from public.profile_tags where profile_id = v_user_id;
  end if;

  if to_regclass('public.profile_achievements') is not null then
    delete from public.profile_achievements where profile_id = v_user_id;
  end if;

  if to_regclass('public.achievements') is not null then
    delete from public.achievements where profile_id = v_user_id;
  end if;

  delete from public.app_user_profiles where profile_key = v_user_id::text;
  delete from public.profiles where id = v_user_id;

  delete from auth.identities where user_id = v_user_id;
  delete from auth.users where id = v_user_id;
end;
$$;

revoke all on function public.app_delete_my_account() from public;
grant execute on function public.app_delete_my_account() to authenticated;
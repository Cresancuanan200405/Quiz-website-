-- Ensure custom-registered auth users are associated with the auth instance.
-- Without instance_id, password grant can return invalid credentials.

update auth.users
set instance_id = '00000000-0000-0000-0000-000000000000'::uuid
where instance_id is null;

create or replace function public.app_register_user(
  p_email text,
  p_password text,
  p_username text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_email text;
  v_username text;
  v_user_id uuid;
  v_instance_id uuid := '00000000-0000-0000-0000-000000000000'::uuid;
begin
  v_email := lower(trim(p_email));
  v_username := coalesce(nullif(trim(p_username), ''), split_part(v_email, '@', 1), 'player');

  if position('@' in v_email) = 0 then
    raise exception 'Invalid email format.';
  end if;

  if char_length(p_password) < 8 then
    raise exception 'Password must be at least 8 characters.';
  end if;

  select u.id
  into v_user_id
  from auth.users u
  where lower(u.email) = v_email
    and coalesce(u.deleted_at, to_timestamp(0)) = to_timestamp(0)
  limit 1;

  if v_user_id is not null then
    update auth.users
    set instance_id = coalesce(instance_id, v_instance_id),
        encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        confirmation_token = coalesce(confirmation_token, ''),
        recovery_token = coalesce(recovery_token, ''),
        email_change_token_new = coalesce(email_change_token_new, ''),
        email_change = coalesce(email_change, ''),
        phone_change = coalesce(phone_change, ''),
        phone_change_token = coalesce(phone_change_token, ''),
        email_change_token_current = coalesce(email_change_token_current, ''),
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('username', v_username),
        updated_at = now()
    where id = v_user_id;

    insert into auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      created_at,
      updated_at,
      last_sign_in_at
    ) values (
      gen_random_uuid(),
      v_email,
      v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'email_verified', true
      ),
      'email',
      now(),
      now(),
      now()
    )
    on conflict (provider_id, provider) do update
      set user_id = excluded.user_id,
          identity_data = excluded.identity_data,
          updated_at = now(),
          last_sign_in_at = now();

    return v_user_id;
  end if;

  v_user_id := gen_random_uuid();

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    phone_change,
    phone_change_token,
    email_change_token_current,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
  ) values (
    v_user_id,
    v_instance_id,
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('username', v_username),
    now(),
    now(),
    false,
    false
  );

  insert into auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    created_at,
    updated_at,
    last_sign_in_at
  ) values (
    gen_random_uuid(),
    v_email,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true
    ),
    'email',
    now(),
    now(),
    now()
  )
  on conflict (provider_id, provider) do update
    set user_id = excluded.user_id,
        identity_data = excluded.identity_data,
        updated_at = now(),
        last_sign_in_at = now();

  return v_user_id;
end;
$$;

revoke all on function public.app_register_user(text, text, text) from public;
grant execute on function public.app_register_user(text, text, text) to anon;
grant execute on function public.app_register_user(text, text, text) to authenticated;
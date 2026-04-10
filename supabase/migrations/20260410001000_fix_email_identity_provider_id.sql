-- Fix email identity mapping so password auth can find users reliably.
-- Safe to run multiple times.

-- Keep only the latest identity per (provider, email) before normalizing provider_id.
with ranked as (
  select
    id,
    provider,
    coalesce(email, identity_data ->> 'email') as identity_email,
    row_number() over (
      partition by provider, coalesce(email, identity_data ->> 'email')
      order by created_at desc nulls last, id desc
    ) as rn
  from auth.identities
  where provider = 'email'
)
delete from auth.identities i
using ranked r
where i.id = r.id
  and r.identity_email is not null
  and r.rn > 1;

-- Ensure identity_data always has email for email-provider identities.
update auth.identities
set identity_data = coalesce(identity_data, '{}'::jsonb) || jsonb_build_object('email', coalesce(email, identity_data ->> 'email')),
    updated_at = now()
where provider = 'email'
  and coalesce(email, identity_data ->> 'email') is not null
  and (identity_data ->> 'email') is null;

-- Normalize provider_id to email for provider=email identities.
update auth.identities
set provider_id = coalesce(email, identity_data ->> 'email'),
    updated_at = now()
where provider = 'email'
  and coalesce(email, identity_data ->> 'email') is not null
  and provider_id <> coalesce(email, identity_data ->> 'email');

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
    set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
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
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
  ) values (
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
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
  );

  return v_user_id;
end;
$$;

revoke all on function public.app_register_user(text, text, text) from public;
grant execute on function public.app_register_user(text, text, text) to anon;
grant execute on function public.app_register_user(text, text, text) to authenticated;

-- Signup now collects name, mobile number, country, and city alongside
-- email/password. Nullable at the DB level (existing rows have none of
-- this, and admin/entitlement columns must stay untouched) — the sign-up
-- form enforces "required" client-side.
alter table users_profile add column if not exists full_name text;
alter table users_profile add column if not exists mobile_number text;
alter table users_profile add column if not exists country text;
alter table users_profile add column if not exists city text;

-- Populate the new columns from auth.users.raw_user_meta_data, which
-- supabase.auth.signUp({ options: { data } }) sets at insert time — before
-- any email-confirmation step, so this works whether or not confirmation
-- is required and needs no second, session-dependent write path.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users_profile (id, full_name, mobile_number, country, city)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'mobile_number',
    new.raw_user_meta_data ->> 'country',
    new.raw_user_meta_data ->> 'city'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

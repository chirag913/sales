-- Sign-up creates the auth.users row (and, via handle_new_user(), the
-- users_profile row) immediately on submission, before the email is
-- confirmed. Without cleanup, abandoned/never-confirmed signups accumulate
-- in users_profile indefinitely. This sweeps them hourly; auth.users' own
-- "on delete cascade" foreign keys take care of users_profile,
-- training_profiles, and calls automatically.
create extension if not exists pg_cron with schema extensions;

create or replace function cleanup_unconfirmed_signups()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from auth.users
  where email_confirmed_at is null
    and created_at < now() - interval '48 hours';
end;
$$;

select cron.schedule(
  'cleanup-unconfirmed-signups',
  '0 * * * *', -- hourly
  $$select cleanup_unconfirmed_signups()$$
);

-- Tighten users_profile UPDATE access: the existing "update own" RLS policy
-- is row-scoped only (auth.uid() = id), so a signed-in user could otherwise
-- PATCH their own row's is_admin / credits_balance / trial_calls_* columns
-- directly via PostgREST. RLS can't restrict columns, only rows, so this is
-- done at the grant level instead: authenticated users may only ever include
-- the new profile columns in an UPDATE's SET list. Postgres checks column
-- privileges against the columns named in SET regardless of the value
-- supplied, so this blocks the attempt even when the smuggled column's value
-- happens to match the current one.
revoke update on users_profile from authenticated;
grant update (full_name, mobile_number, country, city) on users_profile to authenticated;

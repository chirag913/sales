-- Fix: 0011 only revoked EXECUTE from PUBLIC, but Supabase's default
-- privileges grant EXECUTE on new functions directly to anon/authenticated/
-- service_role (not inherited via PUBLIC) — see add_credits() in
-- 0003_entitlements.sql, which already revokes from anon and authenticated
-- separately for exactly this reason. REVOKE FROM PUBLIC alone left anon
-- with a direct EXECUTE grant on all four admin functions. Each function's
-- own internal admin check (auth.uid() has no session under anon, so it
-- always fails) already made this safe in practice, but it directly
-- contradicts "do NOT grant to anon" — fixing the grant itself rather than
-- relying solely on the internal check, matching add_credits()'s style.
revoke execute on function get_admin_overview(numeric) from anon;
revoke execute on function list_admin_users(integer, integer) from anon;
revoke execute on function list_admin_calls(integer, integer) from anon;
revoke execute on function toggle_admin_status(uuid) from anon;

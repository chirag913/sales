-- Security review hardening: call_sessions and payment_transactions are
-- already safe from direct client writes today — RLS is enabled and only a
-- SELECT policy exists for either table, so "no policy" implicitly denies
-- INSERT/UPDATE/DELETE regardless of table-level grants. But the
-- table-level grants themselves are still broad (all columns, all verbs,
-- inherited from Supabase's default per-table grants to anon/authenticated).
-- This makes the denial explicit at the grant level too, so it no longer
-- depends solely on "nobody ever adds a permissive policy later."
--
-- All legitimate writes to these tables already go through SECURITY DEFINER
-- functions (reserve_call_entitlement, mark_call_started,
-- release_call_entitlement, finalize_call, sweep_stale_call_sessions,
-- add_credits) which run as the function owner, not the caller's role — so
-- this REVOKE has no effect on any of them.
revoke insert, update, delete on call_sessions from anon, authenticated;
revoke insert, update, delete on payment_transactions from anon, authenticated;

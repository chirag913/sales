-- Security review finding: RLS on `calls` only checks auth.uid() = user_id,
-- so a user could insert/update arbitrary "completed call" rows directly via
-- the REST API, bypassing /api/calls/save (and its call_sessions check)
-- entirely — self-only impact (no cost, no cross-user access), but it means
-- a user's own call history/analytics can't be trusted as "a real call
-- actually happened."
--
-- Real lifecycle (see reserve_call_entitlement / mark_call_started /
-- finalize_call in 0003_entitlements.sql): call_sessions goes
-- reserved -> started -> completed/timeout (via finalize_call), or
-- reserved -> failed (OpenAI session creation failed) / cancelled. A
-- dropped/abandoned call (browser closed mid-call) never reaches
-- /api/calls/save at all — it just stays 'started' until
-- sweep_stale_call_sessions reconciles it to 'timeout' later; no calls row
-- is expected for it either way.
--
-- /api/calls/save calls finalize_call() BEFORE inserting into calls, so by
-- insert time the linked call_sessions row is already 'completed' or
-- 'timeout', not 'started' — 'started' is included below only as a safety
-- margin, not because the real flow needs it. Excluding 'timeout' here would
-- have broken every real call that hits the time limit.
create or replace function enforce_calls_session_link()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from call_sessions
    where id = new.id
      and user_id = new.user_id
      and status in ('started', 'completed', 'timeout')
  ) then
    raise exception 'calls: no matching call_session for this id/user';
  end if;
  return new;
end;
$$;

drop trigger if exists calls_require_session on calls;
create trigger calls_require_session
  before insert or update on calls
  for each row execute function enforce_calls_session_link();

-- Security review finding: profile/generate, profile/refine, and
-- scenarios/generate call OpenAI with only an auth check — no connection to
-- the credit/trial system (they run before a call exists, so there's no
-- callId to anchor a check against, unlike score/generate and coach/analyze
-- which are now gated by a real call_sessions row). Any authenticated
-- account could spam these in a tight loop for unbounded OpenAI cost. A
-- generous per-user, per-route rate limit closes this without affecting
-- real usage.
--
-- Fixed window (not sliding): each row tracks a window_start and a count;
-- once window_start is more than p_window_seconds old, the window resets to
-- now() with count 1. The upsert's ON CONFLICT is row-locked, so concurrent
-- requests from the same user can't race past the limit.
create table if not exists api_rate_limits (
  user_id uuid references auth.users on delete cascade not null,
  route text not null,
  window_start timestamptz not null default now(),
  request_count integer not null default 0,
  primary key (user_id, route)
);

alter table api_rate_limits enable row level security;
-- No policies: this table is only ever touched via check_rate_limit() below
-- (SECURITY DEFINER), never directly by the client.

create or replace function check_rate_limit(p_route text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  insert into api_rate_limits (user_id, route, window_start, request_count)
  values (v_user_id, p_route, now(), 1)
  on conflict (user_id, route) do update
    set request_count = case
          when api_rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
            then 1
          else api_rate_limits.request_count + 1
        end,
        window_start = case
          when api_rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
            then now()
          else api_rate_limits.window_start
        end
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

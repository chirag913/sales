-- Trial + credit entitlement system.
--
-- All entitlement mutations happen inside SECURITY DEFINER functions that
-- derive the user from auth.uid() (never a client-supplied id), using single
-- atomic UPDATE ... WHERE ... statements — Postgres row-locks these
-- automatically, so concurrent requests (two tabs, retries) can't
-- double-consume a trial call or credit. The browser never has direct
-- insert/update access to call_sessions or payment_transactions.

alter table users_profile add column if not exists trial_calls_used integer not null default 0;
alter table users_profile add column if not exists trial_calls_limit integer not null default 2;

create table if not exists call_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  status text not null default 'reserved' check (status in ('reserved', 'started', 'completed', 'failed', 'cancelled', 'timeout')),
  entitlement_type text not null check (entitlement_type in ('trial', 'credit')),
  credits_used integer not null default 0,
  scenario jsonb,
  identity jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

create index if not exists call_sessions_user_id_status_idx on call_sessions (user_id, status);

alter table call_sessions enable row level security;

create policy "call_sessions: select own" on call_sessions
  for select using (auth.uid() = user_id);

-- Future-Razorpay prep. Not wired up to any payment provider yet — just the
-- shape needed so add_credits() can be idempotent per payment reference.
create table if not exists payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  provider text not null default 'manual',
  provider_payment_id text,
  provider_order_id text,
  amount_inr integer,
  currency text not null default 'INR',
  credits_added integer not null,
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

alter table payment_transactions enable row level security;

create policy "payment_transactions: select own" on payment_transactions
  for select using (auth.uid() = user_id);

-- Internal helper: mark this user's own long-stuck 'started' sessions as
-- timed out. Handles the browser closing, laptop sleeping, crashing, etc.
-- without ever affecting entitlement counts (those were already decided at
-- reservation time) — this only fixes up stale bookkeeping.
create or replace function sweep_stale_call_sessions(p_user_id uuid, p_max_duration_seconds integer)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update call_sessions
  set status = 'timeout',
      ended_at = coalesce(started_at, now()) + make_interval(secs => p_max_duration_seconds),
      duration_seconds = p_max_duration_seconds
  where user_id = p_user_id
    and status = 'started'
    and started_at is not null
    and started_at < now() - make_interval(secs => p_max_duration_seconds);
end;
$$;

create or replace function reserve_call_entitlement(
  p_scenario jsonb,
  p_identity jsonb,
  p_max_duration_seconds integer
)
returns table(call_id uuid, entitlement_type text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_entitlement_type text;
  v_call_id uuid;
  v_rows integer;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  perform sweep_stale_call_sessions(v_user_id, p_max_duration_seconds);

  update users_profile
  set trial_calls_used = trial_calls_used + 1
  where id = v_user_id and trial_calls_used < trial_calls_limit;
  get diagnostics v_rows = row_count;

  if v_rows > 0 then
    v_entitlement_type := 'trial';
  else
    update users_profile
    set credits_balance = credits_balance - 1
    where id = v_user_id and credits_balance > 0;
    get diagnostics v_rows = row_count;

    if v_rows > 0 then
      v_entitlement_type := 'credit';
    else
      raise exception 'entitlement_required';
    end if;
  end if;

  insert into call_sessions (user_id, status, entitlement_type, credits_used, scenario, identity)
  values (
    v_user_id,
    'reserved',
    v_entitlement_type,
    case when v_entitlement_type = 'credit' then 1 else 0 end,
    p_scenario,
    p_identity
  )
  returning id into v_call_id;

  return query select v_call_id, v_entitlement_type;
end;
$$;

create or replace function mark_call_started(p_call_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update call_sessions
  set status = 'started', started_at = now()
  where id = p_call_id and user_id = auth.uid() and status = 'reserved';
end;
$$;

-- Idempotent: only restores the trial/credit if the session was still
-- 'reserved' (never un-does an already-'started' call).
create or replace function release_call_entitlement(p_call_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_entitlement_type text;
  v_user_id uuid := auth.uid();
begin
  update call_sessions
  set status = 'failed', ended_at = now()
  where id = p_call_id and user_id = v_user_id and status = 'reserved'
  returning entitlement_type into v_entitlement_type;

  if v_entitlement_type = 'trial' then
    update users_profile set trial_calls_used = trial_calls_used - 1 where id = v_user_id;
  elsif v_entitlement_type = 'credit' then
    update users_profile set credits_balance = credits_balance + 1 where id = v_user_id;
  end if;
end;
$$;

-- Idempotent: only transitions a still-'started' session. A second call with
-- the same call_id (retry, double-fired end event, refresh) matches zero
-- rows and does nothing — this is the core double-consumption guard.
create or replace function finalize_call(p_call_id uuid, p_status text, p_duration_seconds integer)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_status not in ('completed', 'failed', 'cancelled', 'timeout') then
    raise exception 'invalid_status';
  end if;

  update call_sessions
  set status = p_status, ended_at = now(), duration_seconds = p_duration_seconds
  where id = p_call_id and user_id = auth.uid() and status = 'started';
end;
$$;

create or replace function get_entitlement_status(p_max_duration_seconds integer)
returns table(
  trial_calls_used integer,
  trial_calls_limit integer,
  credits integer,
  trial_remaining integer,
  can_start_call boolean,
  is_admin boolean
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  perform sweep_stale_call_sessions(v_user_id, p_max_duration_seconds);

  return query
  select
    up.trial_calls_used,
    up.trial_calls_limit,
    up.credits_balance,
    greatest(up.trial_calls_limit - up.trial_calls_used, 0),
    up.is_admin or up.trial_calls_used < up.trial_calls_limit or up.credits_balance > 0,
    up.is_admin
  from users_profile up
  where up.id = v_user_id;
end;
$$;

-- Secure server-side credit service for a future Razorpay integration.
-- Idempotent per (provider, provider_payment_id) — the same verified payment
-- can never add credits twice. Locked to service_role: the browser (anon or
-- authenticated) can never call this directly, only a future server-side
-- webhook using the service-role key after verifying payment.
create or replace function add_credits(
  p_user_id uuid,
  p_credits integer,
  p_provider text default 'manual',
  p_provider_payment_id text default null,
  p_provider_order_id text default null,
  p_amount_inr integer default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_inserted_id uuid;
begin
  if p_provider_payment_id is not null then
    insert into payment_transactions (user_id, provider, provider_payment_id, provider_order_id, amount_inr, credits_added)
    values (p_user_id, p_provider, p_provider_payment_id, p_provider_order_id, p_amount_inr, p_credits)
    on conflict (provider, provider_payment_id) do nothing
    returning id into v_inserted_id;

    if v_inserted_id is null then
      return; -- Already processed this exact payment reference.
    end if;
  else
    insert into payment_transactions (user_id, provider, amount_inr, credits_added)
    values (p_user_id, p_provider, p_amount_inr, p_credits);
  end if;

  update users_profile set credits_balance = credits_balance + p_credits where id = p_user_id;
end;
$$;

revoke execute on function add_credits(uuid, integer, text, text, text, integer) from public;
revoke execute on function add_credits(uuid, integer, text, text, text, integer) from anon;
revoke execute on function add_credits(uuid, integer, text, text, text, integer) from authenticated;
grant execute on function add_credits(uuid, integer, text, text, text, integer) to service_role;

-- Fix: reserve_call_entitlement() never checked is_admin, so an admin
-- account with an exhausted trial and 0 credits was still rejected at the
-- one place that actually matters (starting a real call) — even though
-- get_entitlement_status() already correctly reported can_start_call = true
-- for admins. Admins now bypass trial/credit consumption entirely, tracked
-- with entitlement_type = 'admin' (nothing to restore on release/failure).

alter table call_sessions drop constraint if exists call_sessions_entitlement_type_check;
alter table call_sessions add constraint call_sessions_entitlement_type_check
  check (entitlement_type in ('trial', 'credit', 'admin'));

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
  v_is_admin boolean;
  v_entitlement_type text;
  v_call_id uuid;
  v_rows integer;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  perform sweep_stale_call_sessions(v_user_id, p_max_duration_seconds);

  select is_admin into v_is_admin from users_profile where id = v_user_id;

  if v_is_admin then
    v_entitlement_type := 'admin';
  else
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

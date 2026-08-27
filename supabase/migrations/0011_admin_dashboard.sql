-- Admin dashboard: read-mostly reporting functions plus one write (admin
-- toggle), all SECURITY DEFINER with a self-contained admin check — same
-- pattern as reserve_call_entitlement / add_credits / check_rate_limit.
-- Deliberately NOT a blanket "is_admin can read all rows" RLS policy: that
-- would leave every admin's client-side queries able to read (and, absent
-- very careful policy-writing, potentially write) arbitrary rows directly,
-- rather than funneling admin actions through audited, single-purpose
-- functions like the rest of this codebase's privileged operations.

create or replace function get_admin_overview(p_ai_cost_per_minute_inr numeric)
returns table (
  total_users bigint,
  new_users_today bigint,
  new_users_this_week bigint,
  paid_users bigint,
  trial_only_users bigint,
  total_revenue_inr bigint,
  total_calls bigint,
  total_minutes_used bigint,
  estimated_ai_cost_today_inr numeric,
  estimated_ai_cost_this_week_inr numeric,
  estimated_ai_cost_all_time_inr numeric
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_total_users bigint;
  v_paid_users bigint;
begin
  if not exists (select 1 from users_profile admin_check where admin_check.id = auth.uid() and admin_check.is_admin) then
    raise exception 'not_authorized';
  end if;

  select count(*) into v_total_users from users_profile;
  select count(distinct user_id) into v_paid_users from payment_transactions where status = 'completed';

  return query
  select
    v_total_users,
    (select count(*) from users_profile where created_at >= date_trunc('day', now()))::bigint,
    (select count(*) from users_profile where created_at >= date_trunc('week', now()))::bigint,
    v_paid_users,
    (v_total_users - v_paid_users)::bigint,
    (select coalesce(sum(amount_inr), 0) from payment_transactions where status = 'completed')::bigint,
    (select count(*) from calls)::bigint,
    -- call_sessions, not calls: the authoritative source for OpenAI cost —
    -- includes timed-out/abandoned sessions that consumed real API minutes
    -- but may never have reached the calls table (browser closed mid-call,
    -- calls/save never fired). 'reserved'/'failed'/'cancelled' sessions
    -- never actually connected to OpenAI, so they're excluded.
    (select ceil(coalesce(sum(duration_seconds), 0) / 60.0)
       from call_sessions where status in ('completed', 'timeout'))::bigint,
    ((select ceil(coalesce(sum(duration_seconds), 0) / 60.0)
        from call_sessions
        where status in ('completed', 'timeout') and started_at >= date_trunc('day', now()))
      * p_ai_cost_per_minute_inr)::numeric,
    ((select ceil(coalesce(sum(duration_seconds), 0) / 60.0)
        from call_sessions
        where status in ('completed', 'timeout') and started_at >= date_trunc('week', now()))
      * p_ai_cost_per_minute_inr)::numeric,
    ((select ceil(coalesce(sum(duration_seconds), 0) / 60.0)
        from call_sessions where status in ('completed', 'timeout'))
      * p_ai_cost_per_minute_inr)::numeric;
end;
$$;

create or replace function list_admin_users(p_limit integer, p_offset integer)
returns table (
  id uuid,
  full_name text,
  email text,
  mobile_number text,
  country text,
  city text,
  created_at timestamptz,
  trial_calls_used integer,
  credits_balance integer,
  is_admin boolean,
  total_calls_made bigint,
  total_paid_inr bigint,
  total_count bigint
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from users_profile admin_check where admin_check.id = auth.uid() and admin_check.is_admin) then
    raise exception 'not_authorized';
  end if;

  return query
  select
    up.id,
    up.full_name,
    au.email::text,
    up.mobile_number,
    up.country,
    up.city,
    up.created_at,
    up.trial_calls_used,
    up.credits_balance,
    up.is_admin,
    coalesce(c.call_count, 0) as total_calls_made,
    coalesce(p.paid_total, 0) as total_paid_inr,
    count(*) over() as total_count
  from users_profile up
  join auth.users au on au.id = up.id
  left join (
    select user_id, count(*) as call_count from calls group by user_id
  ) c on c.user_id = up.id
  left join (
    select user_id, sum(amount_inr) as paid_total
    from payment_transactions where status = 'completed' group by user_id
  ) p on p.user_id = up.id
  order by up.created_at desc
  limit p_limit offset p_offset;
end;
$$;

create or replace function list_admin_calls(p_limit integer, p_offset integer)
returns table (
  id uuid,
  user_email text,
  scenario_name text,
  scenario_difficulty text,
  duration_seconds integer,
  overall_score integer,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from users_profile admin_check where admin_check.id = auth.uid() and admin_check.is_admin) then
    raise exception 'not_authorized';
  end if;

  return query
  select
    c.id,
    au.email::text,
    c.scenario->>'name',
    c.scenario->>'difficulty',
    c.duration_seconds,
    c.overall_score,
    c.created_at,
    count(*) over() as total_count
  from calls c
  join auth.users au on au.id = c.user_id
  order by c.created_at desc
  limit p_limit offset p_offset;
end;
$$;

-- Returns the target's new is_admin value. Self-demotion is allowed as long
-- as at least one other admin remains — otherwise the account (and this
-- dashboard) would become permanently inaccessible to everyone.
create or replace function toggle_admin_status(p_target_user_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_target_is_admin boolean;
  v_admin_count integer;
begin
  if not exists (select 1 from users_profile admin_check where admin_check.id = auth.uid() and admin_check.is_admin) then
    raise exception 'not_authorized';
  end if;

  select is_admin into v_target_is_admin from users_profile where id = p_target_user_id;
  if v_target_is_admin is null then
    raise exception 'user_not_found';
  end if;

  if p_target_user_id = auth.uid() and v_target_is_admin then
    select count(*) into v_admin_count from users_profile where is_admin;
    if v_admin_count <= 1 then
      raise exception 'cannot_remove_last_admin';
    end if;
  end if;

  update users_profile set is_admin = not v_target_is_admin where id = p_target_user_id;
  return not v_target_is_admin;
end;
$$;

revoke execute on function get_admin_overview(numeric) from public;
revoke execute on function list_admin_users(integer, integer) from public;
revoke execute on function list_admin_calls(integer, integer) from public;
revoke execute on function toggle_admin_status(uuid) from public;

grant execute on function get_admin_overview(numeric) to authenticated;
grant execute on function list_admin_users(integer, integer) to authenticated;
grant execute on function list_admin_calls(integer, integer) to authenticated;
grant execute on function toggle_admin_status(uuid) to authenticated;

-- Manager analytics for the team dashboard: per-member call counts, average
-- score, last-practiced date, and top objection weak spots, visible only to
-- the team owner. Read-only — this migration adds one new function and no
-- new tables/columns, and does not touch reserve_call_entitlement/
-- release_call_entitlement/get_entitlement_status or any invite/create/
-- remove-member function from 0013.

-- Same authorization + lockdown pattern as get_owned_team_overview (0013):
-- owner-only via an internal auth.uid() = teams.owner_id check, revoked
-- from public/anon, granted to authenticated only.
--
-- Joins through team_members.user_id -> calls.user_id, not through
-- call_sessions.team_id — calls has no team_id of its own, and joining via
-- team_members means this reflects a member's FULL call history (including
-- calls made before they joined, or calls made under a different team
-- previously), not just calls that happened to be reserved while on this
-- specific team. That's a deliberate choice: this is "how is this person
-- doing overall," not "how much of this team's pool have they used."
--
-- Team-pool spend still doesn't feed into get_admin_overview/
-- list_admin_users (0011) or this function — those stay separate, per the
-- "no manager analytics" note in 0013's get_owned_team_overview comment,
-- which this migration is what finally adds.
--
-- The owner is only included in the results if they have at least one call
-- themselves (most owners are managers who don't practice) — every other
-- active member is always included, even with zero calls, so the UI can
-- show "No calls yet" rather than silently omitting someone who hasn't
-- started. The 10-calls/70-avg-score "ready" threshold is intentionally
-- NOT computed here — see src/lib/config/readiness.ts — so it can be tuned
-- without a migration.
create or replace function get_team_member_analytics(p_team_id uuid)
returns table(
  user_id uuid,
  email text,
  total_calls integer,
  avg_overall_score integer,
  last_call_at timestamptz,
  top_objection_tags text[]
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from teams where teams.id = p_team_id and teams.owner_id = auth.uid()) then
    raise exception 'not_authorized';
  end if;

  return query
  with member_calls as (
    select tm.user_id, tm.role, c.overall_score, c.created_at, c.objection_tags
    from team_members tm
    left join calls c on c.user_id = tm.user_id
    where tm.team_id = p_team_id and tm.status = 'active'
  ),
  member_stats as (
    select
      mc.user_id,
      max(mc.role) as role, -- role is constant per user_id; max() just extracts it through the group by
      count(mc.created_at)::integer as total_calls, -- counts non-null calls only, so a member with 0 calls (the left-join null row) gets 0, not 1
      round(avg(mc.overall_score))::integer as avg_overall_score, -- avg()/round() over an all-null group is null, matching "null if zero calls"
      max(mc.created_at) as last_call_at
    from member_calls mc
    group by mc.user_id
  ),
  tag_counts as (
    select mc.user_id, tag, count(*) as tag_count
    from member_calls mc, unnest(mc.objection_tags) as tag
    group by mc.user_id, tag
  ),
  top_tags as (
    select user_id, array_agg(tag order by tag_count desc, tag) as tags
    from (
      select user_id, tag, tag_count,
        row_number() over (partition by user_id order by tag_count desc, tag) as rn
      from tag_counts
    ) ranked
    where rn <= 2
    group by user_id
  )
  select
    ms.user_id,
    au.email::text,
    ms.total_calls,
    ms.avg_overall_score,
    ms.last_call_at,
    coalesce(tt.tags, '{}'::text[])
  from member_stats ms
  join auth.users au on au.id = ms.user_id
  left join top_tags tt on tt.user_id = ms.user_id
  where ms.role <> 'owner' or ms.total_calls > 0
  order by au.email;
end;
$$;

revoke execute on function get_team_member_analytics(uuid) from public, anon;
grant execute on function get_team_member_analytics(uuid) to authenticated;

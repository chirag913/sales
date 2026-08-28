-- Fix: get_team_member_analytics() (0014) raised "column reference user_id
-- is ambiguous" — inside a plpgsql function with a RETURNS TABLE(user_id
-- uuid, ...) signature, the OUT parameter user_id becomes a variable in
-- scope for the whole function body, and any BARE (unqualified) column
-- named user_id in a query inside that body collides with it. tag_counts
-- and the final select were already qualified (mc.user_id, ms.user_id,
-- tt.user_id), but top_tags' inner ranked subquery used bare `user_id` in
-- its select list, PARTITION BY, and outer GROUP BY. Same fix pattern as
-- every other CTE here: alias the source and qualify every reference.
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
      max(mc.role) as role,
      count(mc.created_at)::integer as total_calls,
      round(avg(mc.overall_score))::integer as avg_overall_score,
      max(mc.created_at) as last_call_at
    from member_calls mc
    group by mc.user_id
  ),
  tag_counts as (
    select mc.user_id, tag, count(*) as tag_count
    from member_calls mc, unnest(mc.objection_tags) as tag
    group by mc.user_id, tag
  ),
  ranked_tags as (
    select tc.user_id, tc.tag, tc.tag_count,
      row_number() over (partition by tc.user_id order by tc.tag_count desc, tc.tag) as rn
    from tag_counts tc
  ),
  top_tags as (
    select rt.user_id, array_agg(rt.tag order by rt.tag_count desc, rt.tag) as tags
    from ranked_tags rt
    where rt.rn <= 2
    group by rt.user_id
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

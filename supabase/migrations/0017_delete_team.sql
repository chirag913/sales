-- Team deletion (owner-only) and self-service leave (member-only), plus a
-- refactor extracting the shared "how a member stops being on a team" step
-- so remove_team_member (0013, owner-initiated) and the new leave_team
-- (self-initiated) don't duplicate it. Does not touch reserve_call_
-- entitlement/release_call_entitlement or invite_to_team/accept_team_invite.

-- Internal-only: the actual team_members row removal, shared by
-- remove_team_member and leave_team below — each does its OWN
-- authorization check before calling this (owner-removing-someone-else vs.
-- self-removal, which are different checks), so this does none itself.
-- Never granted to any client role, same pattern as get_active_team_id
-- (0013): reachable only from inside other SECURITY DEFINER function
-- bodies, which already run as the function owner regardless of grants.
create or replace function remove_member_row(p_team_id uuid, p_user_id uuid)
returns void
language sql
security definer set search_path = public
as $$
  delete from team_members where team_id = p_team_id and user_id = p_user_id;
$$;

revoke execute on function remove_member_row(uuid, uuid) from public, anon, authenticated;

-- Same signature/behavior as 0013's version — just delegates the row
-- removal to the shared helper above instead of doing it inline.
create or replace function remove_team_member(p_team_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  select owner_id into v_owner_id from teams where id = p_team_id;
  if v_owner_id is null or v_owner_id <> auth.uid() then
    raise exception 'not_authorized';
  end if;
  if p_user_id = v_owner_id then
    raise exception 'cannot_remove_owner';
  end if;

  perform remove_member_row(p_team_id, p_user_id);
end;
$$;

-- Self-service leave. auth.uid() is always the leaving user — no
-- team_id/user_id parameter to trust from the client at all, unlike
-- remove_team_member (which has to take p_user_id because the caller there
-- is removing someone ELSE).
create or replace function leave_team()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_owner_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select tm.team_id into v_team_id from team_members tm where tm.user_id = v_user_id and tm.status = 'active';
  if v_team_id is null then
    raise exception 'not_on_a_team';
  end if;

  select owner_id into v_owner_id from teams where id = v_team_id;
  -- An owner must delete_team() instead — leaving would strand the team
  -- with no owner. src/app/api/teams/leave/route.ts turns this into a
  -- specific "delete the team instead" message.
  if v_owner_id = v_user_id then
    raise exception 'owner_cannot_leave';
  end if;

  perform remove_member_row(v_team_id, v_user_id);
end;
$$;

-- Owner-only. Refunds any remaining pool balance to the owner's own
-- personal credits_balance before removing anything — team credits must
-- never just disappear. call_sessions.team_id and payment_transactions.
-- team_id (0013/0016) have no ON DELETE CASCADE (by design — see their own
-- migrations), so any team that was ever actually used for a real call or a
-- real purchase has rows referencing it; those are nulled out (history
-- preserved, just no longer linked to a team that won't exist) rather than
-- deleted, so a real, used team can still be deleted cleanly rather than
-- failing on a foreign-key violation. team_members/team_invites rows are
-- deleted outright, matching how remove_team_member already handles a
-- departing member (delete the row, not a soft "removed" status). teams
-- itself is deleted last, only after everything referencing it is cleared —
-- a partial delete (e.g. credits refunded but the team row still exists)
-- would be worse than not deleting at all, and this is naturally atomic
-- within the one function call.
create or replace function delete_team(p_team_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner_id uuid;
  v_credits integer;
begin
  select owner_id, credits_balance into v_owner_id, v_credits from teams where id = p_team_id;
  if v_owner_id is null or v_owner_id <> auth.uid() then
    raise exception 'not_authorized';
  end if;

  if v_credits > 0 then
    update users_profile set credits_balance = credits_balance + v_credits where id = v_owner_id;
  end if;

  update call_sessions set team_id = null where team_id = p_team_id;
  update payment_transactions set team_id = null where team_id = p_team_id;

  delete from team_members where team_id = p_team_id;
  delete from team_invites where team_id = p_team_id;
  delete from teams where id = p_team_id;
end;
$$;

revoke execute on function leave_team() from public, anon;
revoke execute on function delete_team(uuid) from public, anon;

grant execute on function leave_team() to authenticated;
grant execute on function delete_team(uuid) to authenticated;

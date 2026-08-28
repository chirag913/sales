-- Team accounts (foundation phase): an agency owner creates a team, invites
-- members by email (shareable link — no transactional email provider exists
-- in this codebase yet), and members' calls draw from a shared team credit
-- pool instead of their own users_profile.credits_balance. Individual
-- (non-team) accounts are completely unaffected — see reserve_call_
-- entitlement below, where the only new branch is reached exclusively via
-- an active team_members row.

-- gen_random_bytes() (used for team_invites.token below) needs pgcrypto —
-- gen_random_uuid() elsewhere in this codebase is core Postgres 13+ and
-- doesn't need it, so this hasn't been required before now. Supabase
-- projects have pgcrypto pre-installed in the `extensions` schema, which
-- isn't on this session's search_path — schema-qualify the call below
-- rather than relying on search_path, so it doesn't matter that the
-- default expression runs outside any of this migration's own functions
-- (which each set search_path = public explicitly).
create extension if not exists pgcrypto with schema extensions;

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users not null,
  credits_balance integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams not null,
  user_id uuid references auth.users not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  -- 'invited' is reserved for a future "owner adds a member directly,
  -- without a token/link flow" feature — nothing in this phase writes it.
  -- accept_team_invite() below always inserts 'active' directly; a
  -- team_members row simply doesn't exist until the invitee has consented.
  status text not null default 'active' check (status in ('invited', 'active')),
  consented_to_visibility boolean not null default false,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

-- A user can be an active member of at most one team at a time. Without
-- this, create_team() (which auto-adds the creator as an active member of
-- their own new team) would let someone who already accepted an invite
-- elsewhere silently end up on two teams, with reserve_call_entitlement's
-- get_active_team_id() picking one via an arbitrary tiebreak. create_team()
-- and accept_team_invite() below catch the resulting unique_violation and
-- raise a clear 'already_on_a_team' error instead.
create unique index if not exists team_members_one_active_team_per_user
  on team_members (user_id) where status = 'active';

create table if not exists team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams not null,
  email text not null,
  invited_by uuid references auth.users not null,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

-- Records which team's pool (if any) an individual call_sessions row drew
-- from, so release_call_entitlement can restore credit to the pool that was
-- ACTUALLY charged at reservation time — never re-derived from the user's
-- current team membership, since they may have left the team (or been
-- removed) between reserve and release.
alter table call_sessions add column if not exists team_id uuid references teams;

alter table call_sessions drop constraint if exists call_sessions_entitlement_type_check;
alter table call_sessions add constraint call_sessions_entitlement_type_check
  check (entitlement_type in ('trial', 'credit', 'admin', 'team_credit'));

alter table teams enable row level security;
alter table team_members enable row level security;
alter table team_invites enable row level security;

-- All writes to these three tables go through the SECURITY DEFINER
-- functions below (never a direct client insert/update/delete) — same
-- pattern as call_sessions/payment_transactions (0010) and the admin
-- dashboard (0011's comment: "funneling admin actions through audited,
-- single-purpose functions... rather than a blanket RLS policy"). Do this
-- explicitly now rather than as a follow-up hardening migration (0010 had
-- to fix this after the fact for call_sessions/payment_transactions).
revoke insert, update, delete on teams, team_members, team_invites from anon, authenticated;

-- Internal-only helper used inside the RLS policies below instead of a raw
-- self-referential subquery on team_members. Derives the user from
-- auth.uid() internally — never takes a p_user_id parameter, which matters
-- here because, unlike get_active_team_id() further down, this one MUST be
-- reachable by the querying role for RLS to evaluate it at all (see grant
-- below), so it can't be locked down to "internal callers only."
create or replace function is_team_member(p_team_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from team_members
    where team_id = p_team_id and user_id = auth.uid()
  );
$$;

-- Postgres checks EXECUTE privilege on any function referenced in an RLS
-- policy against the querying role — including anon, even though the
-- function will simply return false there (auth.uid() is null). Without
-- this grant, an anon SELECT against teams/team_members raises "permission
-- denied for function" instead of the intended empty result.
grant execute on function is_team_member(uuid) to anon, authenticated;

create policy "teams: owner select own" on teams
  for select using (auth.uid() = owner_id);
create policy "teams: members select own team" on teams
  for select using (is_team_member(id));
create policy "teams: owner update own" on teams
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "team_members: select rows for teams you belong to" on team_members
  for select using (is_team_member(team_id));

create policy "team_invites: owner select own team's invites" on team_invites
  for select using (auth.uid() = (select owner_id from teams where id = team_invites.team_id));

-- Internal helper: single source of truth for "which team (if any) charges
-- this user." Called from both reserve_call_entitlement and
-- get_entitlement_status so they can never silently disagree about which
-- team a user draws from. Deliberately NOT granted to any client role
-- (public/anon/authenticated) — unlike is_team_member above, nothing in RLS
-- needs to call this, and taking a p_user_id parameter while being
-- client-callable would let any signed-in user probe whether an arbitrary
-- other user belongs to a team. It's reachable only from inside other
-- SECURITY DEFINER function bodies below, which already run as the
-- function owner regardless of grants to other roles.
create or replace function get_active_team_id(p_user_id uuid)
returns uuid
language sql
security definer set search_path = public
stable
as $$
  select team_id from team_members
  where user_id = p_user_id and status = 'active'
  order by created_at
  limit 1;
$$;

revoke execute on function get_active_team_id(uuid) from public, anon, authenticated;

-- Creates a team and adds the creator as its owner (an active team_members
-- row, not just teams.owner_id) so the owner appears uniformly in the
-- roster alongside members.
create or replace function create_team(p_name text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name_required';
  end if;

  insert into teams (name, owner_id) values (trim(p_name), v_user_id)
  returning id into v_team_id;

  begin
    insert into team_members (team_id, user_id, role, status, consented_to_visibility, joined_at)
    values (v_team_id, v_user_id, 'owner', 'active', true, now());
  exception when unique_violation then
    raise exception 'already_on_a_team';
  end;

  return v_team_id;
end;
$$;

-- Owner-only. Creates an invite row; the caller (src/app/api/teams/invite)
-- turns this into a shareable /accept-invite?token=... link — no email is
-- sent, there's no transactional email provider in this codebase. No dedup
-- against existing pending invites for the same email — acceptable
-- simplicity for this phase, not required by spec.
create or replace function invite_to_team(p_team_id uuid, p_email text)
returns table(id uuid, token text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
  v_token text;
begin
  if not exists (select 1 from teams where teams.id = p_team_id and teams.owner_id = auth.uid()) then
    raise exception 'not_authorized';
  end if;
  if p_email is null or position('@' in p_email) = 0 then
    raise exception 'invalid_email';
  end if;

  insert into team_invites (team_id, email, invited_by)
  values (p_team_id, lower(trim(p_email)), auth.uid())
  returning team_invites.id, team_invites.token into v_id, v_token;

  return query select v_id, v_token;
end;
$$;

-- Deliberately anon-callable (see grant below) — an unauthenticated visitor
-- with an invite link needs to see "You're invited to join Team X" before
-- signing in. Every other function in this migration follows this
-- codebase's established "revoke from anon" convention; this is the one
-- documented exception. valid=false covers both "no such token" and
-- "expired" identically, so the response shape can't be used to
-- distinguish a garbage token from a real, expired one.
create or replace function get_invite_preview(p_token text)
returns table(team_name text, email text, valid boolean)
language plpgsql
security definer set search_path = public
as $$
declare
  v_invite team_invites%rowtype;
begin
  select * into v_invite from team_invites where token = p_token;

  if v_invite.id is null or v_invite.status <> 'pending' or v_invite.expires_at < now() then
    return query select null::text, null::text, false;
    return;
  end if;

  return query
  select t.name, v_invite.email, true
  from teams t where t.id = v_invite.team_id;
end;
$$;

grant execute on function get_invite_preview(text) to anon, authenticated;

-- Creates the team_members row ONLY when p_consent = true — the caller
-- (src/app/api/teams/accept-invite) also re-checks this server-side before
-- ever calling this function, but the function itself never silently
-- accepts either. Matches the invite's email case-insensitively against
-- the calling user's own auth.users.email so a leaked token can't be
-- accepted under an unintended account.
create or replace function accept_team_invite(p_token text, p_consent boolean)
returns table(team_id uuid, team_name text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invite team_invites%rowtype;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;
  if p_consent is not true then
    raise exception 'consent_required';
  end if;

  select * into v_invite from team_invites where token = p_token for update;
  if v_invite.id is null or v_invite.status <> 'pending' or v_invite.expires_at < now() then
    raise exception 'invite_invalid_or_expired';
  end if;

  select email into v_user_email from auth.users where id = v_user_id;
  if v_user_email is null or lower(v_user_email) <> lower(v_invite.email) then
    raise exception 'email_mismatch';
  end if;

  begin
    insert into team_members (team_id, user_id, role, status, consented_to_visibility, joined_at)
    values (v_invite.team_id, v_user_id, 'member', 'active', true, now());
  exception when unique_violation then
    raise exception 'already_on_a_team';
  end;

  update team_invites set status = 'accepted' where team_invites.id = v_invite.id;

  return query select t.id, t.name from teams t where t.id = v_invite.team_id;
end;
$$;

-- Owner-only. Refuses to remove the owner themselves (there's no delete-
-- team feature in this phase, so that would just orphan the row). This is
-- also what makes "member left the team between reserve and release" a
-- reachable case rather than a purely theoretical one that release_call_
-- entitlement defends against.
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

  delete from team_members where team_id = p_team_id and user_id = p_user_id;
end;
$$;

-- Owner-only. team-pool spend and this overview intentionally do NOT feed
-- into get_admin_overview/list_admin_users (0011) — a team member's
-- admin-dashboard row still shows their unchanged personal credits, and
-- team spend doesn't appear in revenue/cost estimates. Consistent with "no
-- manager analytics this phase," noted here so it reads as a decision.
create or replace function get_owned_team_overview(p_team_id uuid)
returns table(
  team_name text,
  credits_balance integer,
  member_user_id uuid,
  member_email text,
  member_role text,
  member_status text,
  member_joined_at timestamptz,
  invite_email text,
  invite_status text,
  invite_expires_at timestamptz
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_team teams%rowtype;
begin
  select * into v_team from teams where id = p_team_id and owner_id = auth.uid();
  if v_team.id is null then
    raise exception 'not_authorized';
  end if;

  return query
  select
    v_team.name,
    v_team.credits_balance,
    tm.user_id,
    au.email::text,
    tm.role,
    tm.status,
    tm.joined_at,
    null::text,
    null::text,
    null::timestamptz
  from team_members tm
  join auth.users au on au.id = tm.user_id
  where tm.team_id = p_team_id

  union all

  select
    v_team.name,
    v_team.credits_balance,
    null::uuid,
    null::text,
    null::text,
    null::text,
    null::timestamptz,
    ti.email,
    ti.status,
    ti.expires_at
  from team_invites ti
  where ti.team_id = p_team_id and ti.status = 'pending';
end;
$$;

-- Locked to service_role, mirroring add_credits() (0003) — not reachable
-- from any authenticated route in this phase. There's no Razorpay-for-teams
-- flow yet (out of scope for this phase), so this is just the balance
-- update with no payment-ledger table; a future team-billing phase should
-- add proper idempotent tracking the way add_credits() does for
-- individuals. In the meantime this is also how team pools get seeded for
-- testing.
create or replace function add_team_credits(p_team_id uuid, p_credits integer)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update teams set credits_balance = credits_balance + p_credits where id = p_team_id;
end;
$$;

revoke execute on function add_team_credits(uuid, integer) from public, anon, authenticated;
grant execute on function add_team_credits(uuid, integer) to service_role;

-- Standard lockdown for every other new function: not public/anon, is
-- authenticated. Matches the gap 0012 had to fix after the fact for the
-- admin dashboard (0011 only revoked from PUBLIC, which didn't cover
-- Supabase's default direct grants to anon/authenticated) — done correctly
-- from the start here.
revoke execute on function create_team(text) from public, anon;
revoke execute on function invite_to_team(uuid, text) from public, anon;
revoke execute on function accept_team_invite(text, boolean) from public, anon;
revoke execute on function remove_team_member(uuid, uuid) from public, anon;
revoke execute on function get_owned_team_overview(uuid) from public, anon;

grant execute on function create_team(text) to authenticated;
grant execute on function invite_to_team(uuid, text) to authenticated;
grant execute on function accept_team_invite(text, boolean) to authenticated;
grant execute on function remove_team_member(uuid, uuid) to authenticated;
grant execute on function get_owned_team_overview(uuid) to authenticated;

-- reserve_call_entitlement: admin check unchanged and still first. The
-- trial branch is byte-for-byte unchanged from 0004 (always users_profile,
-- never pooled — trials don't pool, regardless of team membership). Only
-- the credit-fallback branch changes: an active team member draws from
-- teams.credits_balance instead of users_profile.credits_balance, with NO
-- fallback to personal credits if the team pool is exhausted (a team
-- member's own credits_balance is deliberately inert while on a team — see
-- src/components/onboarding/Paywall.tsx and AuthenticatedShell.tsx, which
-- stop offering personal credit purchases to team members for exactly this
-- reason, so money can't get stranded on a balance that's never consulted
-- here). If the user is not on a team, this function is identical to 0004.
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
  v_team_id uuid;
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
      v_team_id := get_active_team_id(v_user_id);

      if v_team_id is not null then
        update teams
        set credits_balance = credits_balance - 1
        where id = v_team_id and credits_balance > 0;
        get diagnostics v_rows = row_count;

        if v_rows > 0 then
          v_entitlement_type := 'team_credit';
        else
          raise exception 'entitlement_required';
        end if;
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
  end if;

  insert into call_sessions (user_id, status, entitlement_type, credits_used, scenario, identity, team_id)
  values (
    v_user_id,
    'reserved',
    v_entitlement_type,
    case when v_entitlement_type in ('credit', 'team_credit') then 1 else 0 end,
    p_scenario,
    p_identity,
    case when v_entitlement_type = 'team_credit' then v_team_id else null end
  )
  returning id into v_call_id;

  return query select v_call_id, v_entitlement_type;
end;
$$;

-- release_call_entitlement: restores to the team_id recorded on the
-- call_sessions row itself (set at reservation time above) — never
-- re-derived from the user's CURRENT team membership, since they may have
-- left (or been removed by remove_team_member) between reserve and
-- release. If that team_id somehow no longer resolves to a team, the
-- UPDATE simply affects 0 rows — there's no delete-team feature in this
-- phase, so that's unreachable today, but this stays a safe no-op rather
-- than an error if it ever becomes reachable.
create or replace function release_call_entitlement(p_call_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_entitlement_type text;
  v_team_id uuid;
  v_user_id uuid := auth.uid();
begin
  update call_sessions
  set status = 'failed', ended_at = now()
  where id = p_call_id and user_id = v_user_id and status = 'reserved'
  returning entitlement_type, team_id into v_entitlement_type, v_team_id;

  if v_entitlement_type = 'trial' then
    update users_profile set trial_calls_used = trial_calls_used - 1 where id = v_user_id;
  elsif v_entitlement_type = 'credit' then
    update users_profile set credits_balance = credits_balance + 1 where id = v_user_id;
  elsif v_entitlement_type = 'team_credit' and v_team_id is not null then
    update teams set credits_balance = credits_balance + 1 where id = v_team_id;
  end if;
  -- 'admin': nothing to restore, unchanged from today.
end;
$$;

-- get_entitlement_status: adds is_team_member/team_name/team_credits so the
-- UI (nav badge, paywall gating) reflects the team pool for active
-- members — without this, a team member with an exhausted trial and an
-- empty personal credits_balance but a funded team pool would see "0
-- credits, blocked" from this status check while reserve_call_entitlement
-- would actually allow the call. `credits` stays the personal balance
-- unconditionally (callers must branch on is_team_member, not just read
-- credits, exactly like reserve_call_entitlement does).
--
-- CREATE OR REPLACE can't change a function's OUT-parameter row type, so
-- the added columns require dropping the old signature first.
drop function if exists get_entitlement_status(integer);

create or replace function get_entitlement_status(p_max_duration_seconds integer)
returns table(
  trial_calls_used integer,
  trial_calls_limit integer,
  credits integer,
  trial_remaining integer,
  can_start_call boolean,
  is_admin boolean,
  is_team_member boolean,
  team_name text,
  team_credits integer
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  perform sweep_stale_call_sessions(v_user_id, p_max_duration_seconds);
  v_team_id := get_active_team_id(v_user_id);

  return query
  select
    up.trial_calls_used,
    up.trial_calls_limit,
    up.credits_balance,
    greatest(up.trial_calls_limit - up.trial_calls_used, 0),
    up.is_admin
      or up.trial_calls_used < up.trial_calls_limit
      or (v_team_id is not null and coalesce(t.credits_balance, 0) > 0)
      or (v_team_id is null and up.credits_balance > 0),
    up.is_admin,
    v_team_id is not null,
    t.name,
    t.credits_balance
  from users_profile up
  left join teams t on t.id = v_team_id
  where up.id = v_user_id;
end;
$$;

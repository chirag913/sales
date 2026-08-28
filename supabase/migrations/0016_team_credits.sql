-- Razorpay credit purchases for a team's shared pool, mirroring add_credits()
-- (0003_entitlements.sql) exactly: same idempotency-per-(provider,
-- provider_payment_id) approach, same SECURITY DEFINER lockdown to
-- service_role only. Does not touch reserve_call_entitlement/
-- release_call_entitlement/get_entitlement_status or add_credits() itself —
-- the individual-purchase path is completely unchanged.

-- payment_transactions (0003) is scoped to user_id only today. Rather than
-- inventing a parallel ledger table for team purchases — which would need
-- its own separate (provider, provider_payment_id) uniqueness constraint,
-- and two independently-enforced constraints can't cross-check each other
-- (a bug that processed the same payment_id once on each table would double
-- credit across two "idempotent" paths that don't know about each other) —
-- this adds one nullable team_id column to the existing table. user_id
-- stays NOT NULL and still records who actually paid (the team owner);
-- team_id is set only for a team purchase, null for an individual one.
-- Single source of truth, single constraint, no new failure mode.
alter table payment_transactions add column if not exists team_id uuid references teams;

-- p_user_id is required (not in the literal add_credits() shape, but
-- payment_transactions.user_id is NOT NULL — someone has to be recorded as
-- having paid) and is always the team owner in practice (create-order's
-- ownership check ensures only the owner can start a team purchase).
--
-- The 800 cap below is a genuinely independent safety net, not fed by the
-- caller: it's the per-transaction quantity cap (1-20 packs, enforced in
-- src/app/api/razorpay/create-order/route.ts) re-enforced here as a fixed
-- constant rather than a parameter, so a bug or bypass at the API layer
-- can't also defeat the database-level check by just passing a larger cap
-- alongside it. 20 * CREDIT_PACK_CALLS (src/lib/config/pricing.ts, = 40) =
-- 800 — if CREDIT_PACK_CALLS ever changes, update this constant too (same
-- category as this codebase's other places that mirror a small constant
-- across the TS/SQL boundary on purpose, e.g. the entitlement_type/status
-- check constraints).
create or replace function add_team_credits(
  p_team_id uuid,
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
  if p_credits > 800 then
    raise exception 'credits_exceed_transaction_cap';
  end if;

  if p_provider_payment_id is not null then
    insert into payment_transactions (user_id, team_id, provider, provider_payment_id, provider_order_id, amount_inr, credits_added)
    values (p_user_id, p_team_id, p_provider, p_provider_payment_id, p_provider_order_id, p_amount_inr, p_credits)
    on conflict (provider, provider_payment_id) do nothing
    returning id into v_inserted_id;

    if v_inserted_id is null then
      return; -- Already processed this exact payment reference.
    end if;
  else
    insert into payment_transactions (user_id, team_id, provider, amount_inr, credits_added)
    values (p_user_id, p_team_id, p_provider, p_amount_inr, p_credits);
  end if;

  update teams set credits_balance = credits_balance + p_credits where id = p_team_id;
end;
$$;

-- This is a distinct overload from add_team_credits(uuid, integer) (0013,
-- still used as-is by scripts/verify-team-entitlements.mjs to seed test
-- pools with no payment record) — Postgres resolves by the named
-- parameters supabase-js sends, so both coexist without ambiguity. Same
-- lockdown as add_credits(): never reachable from anon/authenticated.
revoke execute on function add_team_credits(uuid, uuid, integer, text, text, text, integer) from public, anon, authenticated;
grant execute on function add_team_credits(uuid, uuid, integer, text, text, text, integer) to service_role;

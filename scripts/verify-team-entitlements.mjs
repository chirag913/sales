#!/usr/bin/env node
// Regression check for the team-credit-pool entitlement logic added in
// supabase/migrations/0013_teams.sql. This is the highest-risk billing path
// in the app (it gates every paid call), so this is a committed script, not
// a one-off — run it again any time reserve_call_entitlement/
// release_call_entitlement/get_entitlement_status change.
//
// Runs against the LIVE linked Supabase project. Creates three disposable
// auth accounts (via admin.createUser, bypassing email confirmation) and a
// throwaway team, exercises the real RPCs a real signed-in user would call,
// and deletes everything it created in a finally block — including the auth
// users themselves, so this never skews get_admin_overview()'s user counts.
//
// Usage: node scripts/verify-team-entitlements.mjs
// Requires .env.local to have NEXT_PUBLIC_SUPABASE_URL,
// NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// supabase-js eagerly constructs a RealtimeClient inside createClient(),
// which requires a global WebSocket constructor on Node < 22. This script
// never uses realtime subscriptions (.channel() etc) — only .auth/.rpc/
// .from — so a never-invoked stub is enough to satisfy the constructor.
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class {};
}

function loadEnvLocal() {
  const path = new URL("../.env.local", import.meta.url);
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const MAX_CALL_DURATION_SECONDS = 300;
const DUMMY_SCENARIO = { name: "verify-team-entitlements", icon: "🧪" };
const DUMMY_IDENTITY = { fullName: "Test Prospect", title: "QA", gender: "female" };
const RUN_ID = Date.now();

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}
function assert(name, cond, detail) {
  record(name, Boolean(cond), detail);
  if (!cond) throw new Error(`Assertion failed: ${name}${detail ? ` (${detail})` : ""}`);
}

async function createTestAccount(label) {
  const email = `qa+team-e2e-${label}-${RUN_ID}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw new Error(`createUser(${label}) failed: ${error.message}`);
  // Track for cleanup immediately — if a later step in this function (or a
  // sibling createTestAccount call) throws, this user must not leak.
  cleanup.userIds.push(data.user.id);

  // signInWithPassword hits the captcha-protected /token endpoint (this
  // project has Turnstile enabled on sign-in/password-reset — see commit
  // 1733464). Get a real session without it via generateLink + verifyOtp
  // instead, which isn't behind that same captcha gate.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError) throw new Error(`generateLink(${label}) failed: ${linkError.message}`);

  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: verifyError } = await client.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });
  if (verifyError) throw new Error(`verifyOtp(${label}) failed: ${verifyError.message}`);

  return { userId: data.user.id, email, client };
}

async function reserve(client) {
  const { data, error } = await client
    .rpc("reserve_call_entitlement", {
      p_scenario: DUMMY_SCENARIO,
      p_identity: DUMMY_IDENTITY,
      p_max_duration_seconds: MAX_CALL_DURATION_SECONDS,
    })
    .single();
  return { data, error };
}

async function release(client, callId) {
  return client.rpc("release_call_entitlement", { p_call_id: callId });
}

async function getStatus(client) {
  const { data, error } = await client
    .rpc("get_entitlement_status", { p_max_duration_seconds: MAX_CALL_DURATION_SECONDS })
    .single();
  if (error) throw new Error(`get_entitlement_status failed: ${error.message}`);
  return data;
}

async function getUsersProfile(userId) {
  const { data, error } = await admin.from("users_profile").select("*").eq("id", userId).single();
  if (error) throw new Error(`users_profile lookup failed: ${error.message}`);
  return data;
}

async function getTeamsRow(teamId) {
  const { data, error } = await admin.from("teams").select("*").eq("id", teamId).single();
  if (error) throw new Error(`teams lookup failed: ${error.message}`);
  return data;
}

const cleanup = { callSessionIds: [], teamId: null, userIds: [] };

async function main() {
  console.log(`\n=== verify-team-entitlements (run ${RUN_ID}) ===\n`);

  // --- Setup: three disposable accounts ---
  const A = await createTestAccount("control");
  const B = await createTestAccount("owner");
  const C = await createTestAccount("member");
  console.log(`Created A=${A.email} B=${B.email} C=${C.email}`);

  // --- (a) Individual unaffected ---
  console.log("\n--- (a) individual account, no team ---");
  {
    const before = await getUsersProfile(A.userId);
    const { data, error } = await reserve(A.client);
    assert("(a) reserve succeeds", !error && data, error?.message);
    assert("(a) entitlement_type is trial or credit, never team_credit", ["trial", "credit"].includes(data.entitlement_type), data.entitlement_type);
    cleanup.callSessionIds.push(data.call_id);

    const after = await getUsersProfile(A.userId);
    if (data.entitlement_type === "trial") {
      assert("(a) trial_calls_used incremented by 1", after.trial_calls_used === before.trial_calls_used + 1);
    } else {
      assert("(a) credits_balance decremented by 1", after.credits_balance === before.credits_balance - 1);
    }

    const { error: releaseError } = await release(A.client, data.call_id);
    assert("(a) release succeeds", !releaseError, releaseError?.message);
    const restored = await getUsersProfile(A.userId);
    if (data.entitlement_type === "trial") {
      assert("(a) trial_calls_used restored exactly", restored.trial_calls_used === before.trial_calls_used);
    } else {
      assert("(a) credits_balance restored exactly", restored.credits_balance === before.credits_balance);
    }
  }

  // --- Set up team: B owns it, seed 2 credits, invite C ---
  console.log("\n--- setting up team (B owner, seeded 2 credits, C invited) ---");
  const { data: teamId, error: createTeamError } = await B.client.rpc("create_team", { p_name: `QA Team ${RUN_ID}` });
  assert("create_team succeeds", !createTeamError && teamId, createTeamError?.message);
  cleanup.teamId = teamId;

  const { error: seedError } = await admin.rpc("add_team_credits", { p_team_id: teamId, p_credits: 2 });
  assert("add_team_credits (service-role seed) succeeds", !seedError, seedError?.message);

  const { data: inviteRow, error: inviteError } = await B.client
    .rpc("invite_to_team", { p_team_id: teamId, p_email: C.email })
    .single();
  assert("invite_to_team succeeds", !inviteError && inviteRow, inviteError?.message);

  // Force C past its trial without burning a real reserved session.
  const { error: trialForceError } = await admin
    .from("users_profile")
    .update({ trial_calls_used: 2 })
    .eq("id", C.userId);
  assert("force C's trial to exhausted (service-role)", !trialForceError, trialForceError?.message);

  // --- (b) Team member draws from pool ---
  console.log("\n--- (b) team member draws from team pool ---");
  {
    const { data: acceptData, error: acceptError } = await C.client
      .rpc("accept_team_invite", { p_token: inviteRow.token, p_consent: true })
      .single();
    assert("(b) accept_team_invite succeeds", !acceptError && acceptData, acceptError?.message);

    const cBeforeProfile = await getUsersProfile(C.userId);
    const teamBefore = await getTeamsRow(teamId);

    const { data: reserveData, error: reserveError } = await reserve(C.client);
    assert("(b) reserve succeeds", !reserveError && reserveData, reserveError?.message);
    assert("(b) entitlement_type is team_credit", reserveData?.entitlement_type === "team_credit", reserveData?.entitlement_type);
    cleanup.callSessionIds.push(reserveData.call_id);

    const teamAfter = await getTeamsRow(teamId);
    assert("(b) teams.credits_balance decremented by 1", teamAfter.credits_balance === teamBefore.credits_balance - 1);

    const cAfterProfile = await getUsersProfile(C.userId);
    assert("(b) C's personal credits_balance unchanged", cAfterProfile.credits_balance === cBeforeProfile.credits_balance);

    const { error: releaseError } = await release(C.client, reserveData.call_id);
    assert("(b) release succeeds", !releaseError, releaseError?.message);
    const teamRestored = await getTeamsRow(teamId);
    assert("(b) teams.credits_balance restored by 1", teamRestored.credits_balance === teamBefore.credits_balance);

    const status = await getStatus(C.client);
    assert("(b) get_entitlement_status: is_team_member true", status.is_team_member === true);
    assert("(b) get_entitlement_status: team_credits matches pool", status.team_credits === teamRestored.credits_balance, `${status.team_credits} vs ${teamRestored.credits_balance}`);
    assert("(b) get_entitlement_status: can_start_call true", status.can_start_call === true);
  }

  // --- (c) Pool exhaustion blocks the call ---
  console.log("\n--- (c) pool exhaustion blocks the call ---");
  {
    // B (the owner) still has its own individual trial calls available —
    // reserve_call_entitlement checks trial before team credit, and trials
    // are individual regardless of team membership (by design, "trials
    // don't pool"). Exhaust B's trial too, same as C's earlier, so B's
    // reserve below actually exercises the shared-pool branch rather than
    // succeeding via B's own unrelated trial allowance.
    const { error: bTrialForceError } = await admin.from("users_profile").update({ trial_calls_used: 2 }).eq("id", B.userId);
    assert("force B's trial to exhausted (service-role)", !bTrialForceError, bTrialForceError?.message);

    const team = await getTeamsRow(teamId);
    let remaining = team.credits_balance;
    while (remaining > 0) {
      const { data, error } = await reserve(C.client);
      assert(`(c) reserve succeeds while pool has credit (remaining=${remaining})`, !error && data, error?.message);
      cleanup.callSessionIds.push(data.call_id);
      remaining -= 1;
    }

    const { error: exhaustedError } = await reserve(C.client);
    assert("(c) reserve raises entitlement_required once pool is empty (member)", exhaustedError?.message === "entitlement_required", exhaustedError?.message);

    const { error: ownerExhaustedError } = await reserve(B.client);
    assert("(c) reserve raises entitlement_required for owner too (shared, not per-seat)", ownerExhaustedError?.message === "entitlement_required", ownerExhaustedError?.message);

    const status = await getStatus(C.client);
    assert("(c) get_entitlement_status: can_start_call false", status.can_start_call === false);
    assert("(c) get_entitlement_status: team_credits is 0", status.team_credits === 0, status.team_credits);
  }

  console.log("\n=== all assertions passed ===\n");
}

async function cleanupAll() {
  console.log("\n--- cleanup ---");
  // call_sessions.team_id has no ON DELETE CASCADE (unlike .user_id, which
  // does), so any call_sessions row still pointing at our test team must be
  // removed before the teams row itself, or that delete fails with a FK
  // violation — delete by team_id/user_id directly rather than relying on
  // the id list, since a released call's team_id survives the release.
  for (const callId of cleanup.callSessionIds) {
    await admin.from("call_sessions").delete().eq("id", callId);
  }
  if (cleanup.teamId) {
    await admin.from("call_sessions").delete().eq("team_id", cleanup.teamId);
  }
  for (const userId of cleanup.userIds) {
    await admin.from("call_sessions").delete().eq("user_id", userId);
  }
  if (cleanup.teamId) {
    await admin.from("team_invites").delete().eq("team_id", cleanup.teamId);
    await admin.from("team_members").delete().eq("team_id", cleanup.teamId);
    await admin.from("teams").delete().eq("id", cleanup.teamId);
  }
  for (const userId of cleanup.userIds) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
  console.log("cleanup done");
}

let exitCode = 0;
try {
  await main();
} catch (err) {
  console.error("\n=== FAILED ===");
  console.error(err instanceof Error ? err.message : err);
  exitCode = 1;
} finally {
  await cleanupAll();
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} assertions passed`);
  if (failed.length > 0) {
    console.log("Failed:");
    for (const f of failed) console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    exitCode = 1;
  }
  process.exit(exitCode);
}

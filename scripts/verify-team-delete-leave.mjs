#!/usr/bin/env node
// Regression check for delete_team()/leave_team() (supabase/migrations/
// 0017_delete_team.sql) and the remove_team_member() refactor that shares
// remove_member_row() with leave_team(). Runs against the LIVE linked
// Supabase project with disposable accounts, cleaned up in a finally block.
//
// Requires the dev server running at http://localhost:3000 (for the
// route-level checks) and .env.local with NEXT_PUBLIC_SUPABASE_URL,
// NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
//
// Usage: node scripts/verify-team-delete-leave.mjs

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = class {};

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
const BASE = "http://localhost:3000";
const MAX_CALL_DURATION_SECONDS = 300;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

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

const cleanup = { userIds: [], teamIds: [] };

async function createTestAccount(label) {
  const email = `qa+team-delete-leave-${label}-${RUN_ID}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw new Error(`createUser(${label}): ${error.message}`);
  cleanup.userIds.push(data.user.id);

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError) throw new Error(`generateLink(${label}): ${linkError.message}`);

  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: verifyData, error: verifyError } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (verifyError) throw new Error(`verifyOtp(${label}): ${verifyError.message}`);

  const capturedCookies = [];
  const serverClient = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: { getAll: () => [], setAll: (toSet) => capturedCookies.push(...toSet) },
  });
  await serverClient.auth.setSession({
    access_token: verifyData.session.access_token,
    refresh_token: verifyData.session.refresh_token,
  });
  const cookieHeader = capturedCookies.map((c) => `${c.name}=${c.value}`).join("; ");

  return { userId: data.user.id, email, client: anon, cookieHeader };
}

async function seedMember(teamId, userId, role = "member") {
  const { error } = await admin
    .from("team_members")
    .insert({ team_id: teamId, user_id: userId, role, status: "active", consented_to_visibility: true, joined_at: new Date().toISOString() });
  if (error) throw new Error(`seedMember: ${error.message}`);
}

async function getPersonalCredits(userId) {
  const { data, error } = await admin.from("users_profile").select("credits_balance").eq("id", userId).single();
  if (error) throw new Error(`users_profile lookup: ${error.message}`);
  return data.credits_balance;
}

async function teamExists(teamId) {
  const { data } = await admin.from("teams").select("id").eq("id", teamId).maybeSingle();
  return Boolean(data);
}

async function membershipExists(teamId, userId) {
  const { data } = await admin.from("team_members").select("id").eq("team_id", teamId).eq("user_id", userId).maybeSingle();
  return Boolean(data);
}

async function postJson(path, cookieHeader, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieHeader },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

// Proves the departed user's next entitlement check works via the
// individual path, not an error against a team that no longer applies to
// them — reserve then release so nothing is left consumed.
async function assertIndividualEntitlementWorks(account, label) {
  const { data, error } = await account.client
    .rpc("reserve_call_entitlement", { p_scenario: {}, p_identity: {}, p_max_duration_seconds: MAX_CALL_DURATION_SECONDS })
    .single();
  assert(`${label}: reserve_call_entitlement succeeds via individual path`, !error && data, error?.message);
  assert(`${label}: entitlement_type is trial or credit, not team_credit`, ["trial", "credit"].includes(data.entitlement_type), data.entitlement_type);
  const { error: releaseError } = await account.client.rpc("release_call_entitlement", { p_call_id: data.call_id });
  assert(`${label}: release_call_entitlement succeeds`, !releaseError, releaseError?.message);
}

async function main() {
  console.log(`\n=== verify-team-delete-leave (run ${RUN_ID}) ===\n`);

  // --- Part A: delete_team, funded pool + real member ---
  console.log("\n--- delete_team: funded pool, real member, refund, member fallback ---");
  const B = await createTestAccount("owner-a");
  const M1 = await createTestAccount("member-a");

  const { data: teamId, error: createTeamError } = await B.client.rpc("create_team", { p_name: `QA Delete Team ${RUN_ID}` });
  assert("create_team succeeds", !createTeamError && teamId, createTeamError?.message);
  cleanup.teamIds.push(teamId);

  await seedMember(teamId, M1.userId);
  const { error: fundError } = await admin.rpc("add_team_credits", { p_team_id: teamId, p_credits: 50 });
  assert("fund team pool with 50 credits (service-role)", !fundError, fundError?.message);

  const ownerBaselinePersonal = await getPersonalCredits(B.userId);

  const { error: deleteError } = await B.client.rpc("delete_team", { p_team_id: teamId });
  assert("delete_team succeeds for the owner", !deleteError, deleteError?.message);

  assert("team row no longer exists", !(await teamExists(teamId)));
  const ownerAfterDeletePersonal = await getPersonalCredits(B.userId);
  assert("pool credits (50) refunded to owner's personal balance", ownerAfterDeletePersonal === ownerBaselinePersonal + 50, `${ownerBaselinePersonal} -> ${ownerAfterDeletePersonal}`);
  assert("M1's team_members row is gone", !(await membershipExists(teamId, M1.userId)));

  await assertIndividualEntitlementWorks(M1, "M1 after team deleted");

  const mineAfterDeleteRes = await fetch(`${BASE}/api/teams/mine`, { headers: { cookie: B.cookieHeader } });
  const mineAfterDelete = await mineAfterDeleteRes.json();
  assert("GET /api/teams/mine shows role:null for the former owner", mineAfterDelete.role === null, JSON.stringify(mineAfterDelete));

  // --- Non-owner cannot delete a DIFFERENT team ---
  console.log("\n--- delete_team: non-owner rejected ---");
  const B2 = await createTestAccount("owner-b");
  const M3 = await createTestAccount("nonowner-b");
  const { data: team2Id, error: createTeam2Error } = await B2.client.rpc("create_team", { p_name: `QA Delete Team 2 ${RUN_ID}` });
  assert("create second team succeeds", !createTeam2Error && team2Id, createTeam2Error?.message);
  cleanup.teamIds.push(team2Id);
  await seedMember(team2Id, M3.userId);

  const { error: nonOwnerRpcError } = await M3.client.rpc("delete_team", { p_team_id: team2Id });
  assert("non-owner delete_team RPC is rejected", nonOwnerRpcError?.message === "not_authorized", nonOwnerRpcError?.message);
  assert("team2 still exists after rejected attempt", await teamExists(team2Id));

  const routeAsNonOwner = await postJson("/api/teams/delete", M3.cookieHeader, { teamId: team2Id });
  assert("non-owner DELETE route is rejected (403)", routeAsNonOwner.status === 403 && routeAsNonOwner.body?.error === "not_authorized", JSON.stringify(routeAsNonOwner));
  assert("team2 still exists after rejected route call", await teamExists(team2Id));

  // Clean up team2 properly via the real owner, exercising the route too.
  const routeAsOwner = await postJson("/api/teams/delete", B2.cookieHeader, { teamId: team2Id });
  assert("owner DELETE route succeeds", routeAsOwner.status === 200, JSON.stringify(routeAsOwner));
  assert("team2 gone after owner deletes via route", !(await teamExists(team2Id)));

  // --- Part B: leave_team ---
  console.log("\n--- leave_team: member leaves, owner cannot, consistency with remove_team_member ---");
  const B3 = await createTestAccount("owner-c");
  const M4 = await createTestAccount("member-c-leaves");
  const M5 = await createTestAccount("member-c-removed");
  const M6 = await createTestAccount("member-c-leaves-too");

  const { data: team3Id, error: createTeam3Error } = await B3.client.rpc("create_team", { p_name: `QA Leave Team ${RUN_ID}` });
  assert("create third team succeeds", !createTeam3Error && team3Id, createTeam3Error?.message);
  cleanup.teamIds.push(team3Id);
  await seedMember(team3Id, M4.userId);
  await seedMember(team3Id, M5.userId);
  await seedMember(team3Id, M6.userId);

  // M4 leaves via the RPC directly.
  const { error: leaveError } = await M4.client.rpc("leave_team");
  assert("M4 leave_team RPC succeeds", !leaveError, leaveError?.message);
  assert("M4's team_members row is gone", !(await membershipExists(team3Id, M4.userId)));
  await assertIndividualEntitlementWorks(M4, "M4 after leaving");

  // Owner cannot leave — direct RPC call, not just the UI.
  const { error: ownerLeaveError } = await B3.client.rpc("leave_team");
  assert("owner leave_team RPC is rejected", ownerLeaveError?.message === "owner_cannot_leave", ownerLeaveError?.message);
  assert("team3 still exists (owner did not leave)", await teamExists(team3Id));

  // Route-level: not_on_a_team for someone with no team at all (M4, having just left).
  const routeNotOnTeam = await postJson("/api/teams/leave", M4.cookieHeader, {});
  assert("route: not_on_a_team after already leaving", routeNotOnTeam.status === 400 && routeNotOnTeam.body?.error === "not_on_a_team", JSON.stringify(routeNotOnTeam));

  // Route-level: owner gets the specific actionable message.
  const routeOwnerLeave = await postJson("/api/teams/leave", B3.cookieHeader, {});
  assert(
    "route: owner_cannot_leave (403) with actionable message",
    routeOwnerLeave.status === 403 && routeOwnerLeave.body?.error === "owner_cannot_leave" && /delete the team/i.test(routeOwnerLeave.body?.message ?? ""),
    JSON.stringify(routeOwnerLeave)
  );

  // Consistency: M5 removed by the owner, M6 leaves on its own — same end state.
  const { error: removeError } = await B3.client.rpc("remove_team_member", { p_team_id: team3Id, p_user_id: M5.userId });
  assert("owner remove_team_member succeeds for M5", !removeError, removeError?.message);
  const routeM6Leave = await postJson("/api/teams/leave", M6.cookieHeader, {});
  assert("M6 leaves via route", routeM6Leave.status === 200, JSON.stringify(routeM6Leave));

  const m5Gone = !(await membershipExists(team3Id, M5.userId));
  const m6Gone = !(await membershipExists(team3Id, M6.userId));
  assert("removed member (M5) and self-left member (M6) reach the identical end state (row gone)", m5Gone && m6Gone, `M5 gone=${m5Gone}, M6 gone=${m6Gone}`);
  await assertIndividualEntitlementWorks(M5, "M5 after being removed");
  await assertIndividualEntitlementWorks(M6, "M6 after leaving via route");

  console.log("\n=== all assertions passed ===\n");
}

async function cleanupAll() {
  console.log("\n--- cleanup ---");
  for (const teamId of cleanup.teamIds) {
    await admin.from("call_sessions").delete().eq("team_id", teamId);
    await admin.from("payment_transactions").delete().eq("team_id", teamId);
    await admin.from("team_invites").delete().eq("team_id", teamId);
    await admin.from("team_members").delete().eq("team_id", teamId);
    await admin.from("teams").delete().eq("id", teamId);
  }
  for (const userId of cleanup.userIds) {
    await admin.from("call_sessions").delete().eq("user_id", userId);
    await admin.from("payment_transactions").delete().eq("user_id", userId);
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

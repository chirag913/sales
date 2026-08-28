#!/usr/bin/env node
// Regression check for get_team_member_analytics() (supabase/migrations/
// 0014_team_analytics.sql) and its owner-only gate at both the RPC and
// route (/api/teams/analytics) levels. Runs against the LIVE linked
// Supabase project with disposable accounts, cleaned up in a finally block.
//
// Requires the dev server running at http://localhost:3000 (for the
// route-level non-owner check) and .env.local with
// NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY.
//
// Usage: node scripts/verify-team-analytics.mjs

import { randomUUID } from "node:crypto";
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

const cleanup = { userIds: [], teamId: null };

// Real session + the exact cookie set @supabase/ssr's browser client would
// set, so the route-level (HTTP) checks exercise real auth cookies, not
// just an authenticated supabase-js client — same technique proven in the
// team-accounts UI walkthrough last session.
async function createTestAccount(label) {
  const email = `qa+team-analytics-${label}-${RUN_ID}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw new Error(`createUser(${label}) failed: ${error.message}`);
  cleanup.userIds.push(data.user.id);

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError) throw new Error(`generateLink(${label}) failed: ${linkError.message}`);

  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: verifyData, error: verifyError } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (verifyError) throw new Error(`verifyOtp(${label}) failed: ${verifyError.message}`);

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

async function fetchAnalyticsViaRoute(cookieHeader) {
  const res = await fetch(`${BASE}/api/teams/analytics`, { headers: { cookie: cookieHeader } });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

// call_sessions requires status in ('started','completed','timeout') for
// enforce_calls_session_link (0008) to allow a matching `calls` insert —
// synthesize both rows directly via service-role rather than going through
// reserve_call_entitlement, since this test only cares about calls-table
// aggregation, not entitlement bookkeeping.
async function insertSyntheticCall(userId, overallScore, objectionTags) {
  const id = randomUUID();
  const { error: sessionError } = await admin.from("call_sessions").insert({
    id,
    user_id: userId,
    status: "completed",
    entitlement_type: "trial",
    credits_used: 0,
    scenario: {},
    identity: {},
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    duration_seconds: 60,
  });
  if (sessionError) throw new Error(`insert call_sessions failed: ${sessionError.message}`);

  const { error: callError } = await admin.from("calls").insert({
    id,
    user_id: userId,
    scenario: {},
    identity: {},
    duration_seconds: 60,
    overall_score: overallScore,
    categories: [],
    metrics: {},
    biggest_mistake: "",
    best_moment: "",
    better_responses: [],
    transcript: [],
    objection_tags: objectionTags,
  });
  if (callError) throw new Error(`insert calls failed: ${callError.message}`);
  return id;
}

async function seedMemberDirectly(teamId, userId, role) {
  const { error } = await admin.from("team_members").insert({
    team_id: teamId,
    user_id: userId,
    role,
    status: "active",
    consented_to_visibility: true,
    joined_at: new Date().toISOString(),
  });
  if (error) throw new Error(`seed team_members failed: ${error.message}`);
}

function findMember(members, userId) {
  return members.find((m) => m.user_id === userId);
}

async function main() {
  console.log(`\n=== verify-team-analytics (run ${RUN_ID}) ===\n`);

  const B = await createTestAccount("owner");
  const M1 = await createTestAccount("m1-below-calls");
  const M2 = await createTestAccount("m2-ready");
  const M3 = await createTestAccount("m3-below-score");
  const M4 = await createTestAccount("m4-zero-calls");
  console.log(`Created B=${B.email} M1=${M1.email} M2=${M2.email} M3=${M3.email} M4=${M4.email}`);

  const { data: teamId, error: createTeamError } = await B.client.rpc("create_team", { p_name: `QA Analytics Team ${RUN_ID}` });
  assert("create_team succeeds", !createTeamError && teamId, createTeamError?.message);
  cleanup.teamId = teamId;

  await seedMemberDirectly(teamId, M1.userId, "member");
  await seedMemberDirectly(teamId, M2.userId, "member");
  await seedMemberDirectly(teamId, M3.userId, "member");
  await seedMemberDirectly(teamId, M4.userId, "member");

  console.log("\n--- seeding synthetic call history ---");
  // M1: 9 calls (just below READINESS_MIN_CALLS=10), high score -> not ready via call count.
  for (let i = 0; i < 5; i++) await insertSyntheticCall(M1.userId, 100, ["PRICE"]);
  for (let i = 0; i < 3; i++) await insertSyntheticCall(M1.userId, 100, ["TRUST"]);
  await insertSyntheticCall(M1.userId, 100, ["TIME"]);

  // M2: exactly at both thresholds (10 calls, avg 70) -> ready.
  for (let i = 0; i < 10; i++) await insertSyntheticCall(M2.userId, 70, ["TIME"]);

  // M3: 10 calls (at call-count threshold), avg 69 (just below score threshold) -> not ready.
  for (let i = 0; i < 10; i++) await insertSyntheticCall(M3.userId, 69, []);

  // M4: no calls at all.
  // B (owner): no calls at all -> should be excluded from results entirely.

  console.log("\n--- as owner (B): RPC ---");
  const { data: rpcRows, error: rpcError } = await B.client.rpc("get_team_member_analytics", { p_team_id: teamId });
  assert("owner RPC call succeeds", !rpcError && Array.isArray(rpcRows), rpcError?.message);

  const m1 = findMember(rpcRows, M1.userId);
  const m2 = findMember(rpcRows, M2.userId);
  const m3 = findMember(rpcRows, M3.userId);
  const m4 = findMember(rpcRows, M4.userId);
  const bRow = findMember(rpcRows, B.userId);

  assert("M1 present with 9 calls", m1?.total_calls === 9, m1?.total_calls);
  assert("M1 avg_overall_score is 100", m1?.avg_overall_score === 100, m1?.avg_overall_score);
  assert("M1 top_objection_tags is [PRICE, TRUST] (top 2 of 3)", JSON.stringify(m1?.top_objection_tags) === JSON.stringify(["PRICE", "TRUST"]), JSON.stringify(m1?.top_objection_tags));
  assert("M1 not ready (9 < 10 calls)", m1.total_calls < 10 && m1.avg_overall_score >= 70);

  assert("M2 present with 10 calls", m2?.total_calls === 10, m2?.total_calls);
  assert("M2 avg_overall_score is 70", m2?.avg_overall_score === 70, m2?.avg_overall_score);
  assert("M2 exactly at both thresholds -> ready", m2.total_calls >= 10 && m2.avg_overall_score >= 70);

  assert("M3 present with 10 calls", m3?.total_calls === 10, m3?.total_calls);
  assert("M3 avg_overall_score is 69", m3?.avg_overall_score === 69, m3?.avg_overall_score);
  assert("M3 not ready (69 < 70 avg score)", m3.total_calls >= 10 && m3.avg_overall_score < 70);
  assert("M3 top_objection_tags is empty (no objections tagged)", Array.isArray(m3?.top_objection_tags) && m3.top_objection_tags.length === 0);

  assert("M4 present with 0 calls (not omitted)", m4?.total_calls === 0, m4?.total_calls);
  assert("M4 avg_overall_score is null", m4?.avg_overall_score === null, m4?.avg_overall_score);
  assert("M4 last_call_at is null", m4?.last_call_at === null, m4?.last_call_at);
  assert("M4 top_objection_tags is empty array, not null", Array.isArray(m4?.top_objection_tags) && m4.top_objection_tags.length === 0);

  assert("owner (B) with 0 calls is excluded entirely", bRow === undefined, JSON.stringify(bRow));

  console.log("\n--- as owner (B): route (/api/teams/analytics) ---");
  const routeAsOwner = await fetchAnalyticsViaRoute(B.cookieHeader);
  assert("owner route call returns 200", routeAsOwner.status === 200, routeAsOwner.status);
  const routeM2 = routeAsOwner.body?.members?.find((m) => m.userId === M2.userId);
  assert("owner route response matches RPC for M2", routeM2?.totalCalls === 10 && routeM2?.avgOverallScore === 70, JSON.stringify(routeM2));

  console.log("\n--- as non-owner (M1): RPC and route must both be rejected ---");
  const { error: nonOwnerRpcError } = await M1.client.rpc("get_team_member_analytics", { p_team_id: teamId });
  assert("non-owner RPC call is rejected", nonOwnerRpcError?.message === "not_authorized", nonOwnerRpcError?.message);

  const routeAsNonOwner = await fetchAnalyticsViaRoute(M1.cookieHeader);
  assert("non-owner route call is rejected (403)", routeAsNonOwner.status === 403, routeAsNonOwner.status);
  assert("non-owner route body has no member data", !routeAsNonOwner.body?.members, JSON.stringify(routeAsNonOwner.body));

  console.log("\n=== all assertions passed ===\n");
}

async function cleanupAll() {
  console.log("\n--- cleanup ---");
  for (const userId of cleanup.userIds) {
    await admin.from("call_sessions").delete().eq("user_id", userId);
    await admin.from("calls").delete().eq("user_id", userId);
  }
  if (cleanup.teamId) {
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

#!/usr/bin/env node
// Regression check for the Razorpay credit-pack flow's quantity + team-pool
// extension (supabase/migrations/0016_team_credits.sql,
// src/app/api/razorpay/{create-order,verify,webhook}/route.ts). Runs against
// the LIVE linked Supabase project AND the real Razorpay API in TEST MODE
// (RAZORPAY_KEY_ID starts with rzp_test_ — verified before this script does
// anything). Real orders are created via the real create-order route (safe,
// costs nothing in test mode); payments are never actually completed
// through Razorpay's checkout — instead this computes the same HMAC
// signatures Razorpay itself would send (using the test-mode key/webhook
// secrets this project already has), which is the standard way to test a
// signature-verified payment/webhook integration without a real card.
//
// Requires the dev server running at http://localhost:3000 and .env.local
// with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,
// RAZORPAY_WEBHOOK_SECRET.
//
// Usage: node scripts/verify-razorpay-credits.mjs

import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import Razorpay from "razorpay";

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
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const BASE = "http://localhost:3000";
const CREDIT_PACK_CALLS = 40;
const CREDIT_PACK_PRICE_INR = 999;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY || !RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || !RAZORPAY_WEBHOOK_SECRET) {
  console.error("Missing required env vars (Supabase and/or Razorpay).");
  process.exit(1);
}
if (!RAZORPAY_KEY_ID.startsWith("rzp_test_")) {
  console.error(`Refusing to run: RAZORPAY_KEY_ID does not look like a test-mode key (${RAZORPAY_KEY_ID.slice(0, 12)}...).`);
  process.exit(1);
}

const RUN_ID = Date.now();
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });

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

async function createTestAccount(label) {
  const email = `qa+razorpay-${label}-${RUN_ID}@example.com`;
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

async function postJson(path, cookieHeader, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieHeader },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

function verifySignature(orderId, paymentId) {
  return createHmac("sha256", RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
}

async function postWebhookEvent(eventBody) {
  const raw = JSON.stringify(eventBody);
  const signature = createHmac("sha256", RAZORPAY_WEBHOOK_SECRET).update(raw).digest("hex");
  const res = await fetch(`${BASE}/api/razorpay/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-razorpay-signature": signature },
    body: raw,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function getCredits(userId) {
  const { data, error } = await admin.from("users_profile").select("credits_balance").eq("id", userId).single();
  if (error) throw new Error(`users_profile lookup: ${error.message}`);
  return data.credits_balance;
}

async function getTeamCredits(teamId) {
  const { data, error } = await admin.from("teams").select("credits_balance").eq("id", teamId).single();
  if (error) throw new Error(`teams lookup: ${error.message}`);
  return data.credits_balance;
}

async function main() {
  console.log(`\n=== verify-razorpay-credits (run ${RUN_ID}, test-mode key ${RAZORPAY_KEY_ID.slice(0, 12)}...) ===\n`);

  const A = await createTestAccount("individual");
  const B = await createTestAccount("team-owner");
  const M1 = await createTestAccount("team-nonowner");
  console.log(`Created A=${A.email} B=${B.email} M1=${M1.email}`);

  // --- (a) Individual regression: single pack, no quantity/teamId in the request ---
  console.log("\n--- (a) individual, single pack (regression) ---");
  const baselineA = await getCredits(A.userId);

  const orderA = await postJson("/api/razorpay/create-order", A.cookieHeader, {});
  assert("(a) create-order succeeds with no body", orderA.status === 200, JSON.stringify(orderA.body));
  assert("(a) amount is exactly one pack's price", orderA.body.amount === CREDIT_PACK_PRICE_INR * 100, orderA.body.amount);

  const orderANotes = (await razorpay.orders.fetch(orderA.body.orderId)).notes;
  assert("(a) order notes: quantity=1, no teamId", orderANotes.quantity === "1" && !orderANotes.teamId, JSON.stringify(orderANotes));

  const paymentIdA = `pay_test_individual_${RUN_ID}`;
  const sigA = verifySignature(orderA.body.orderId, paymentIdA);
  const verifyA1 = await postJson("/api/razorpay/verify", A.cookieHeader, {
    razorpayOrderId: orderA.body.orderId,
    razorpayPaymentId: paymentIdA,
    razorpaySignature: sigA,
  });
  assert("(a) verify succeeds", verifyA1.status === 200, JSON.stringify(verifyA1.body));

  const afterFirstA = await getCredits(A.userId);
  assert("(a) credits_balance increased by exactly CREDIT_PACK_CALLS", afterFirstA === baselineA + CREDIT_PACK_CALLS, `${baselineA} -> ${afterFirstA}`);

  // Duplicate verify delivery for the same payment — must not double-credit.
  const verifyA2 = await postJson("/api/razorpay/verify", A.cookieHeader, {
    razorpayOrderId: orderA.body.orderId,
    razorpayPaymentId: paymentIdA,
    razorpaySignature: sigA,
  });
  assert("(a) duplicate verify still returns ok", verifyA2.status === 200, JSON.stringify(verifyA2.body));
  const afterDupA = await getCredits(A.userId);
  assert("(a) duplicate verify does not double-credit", afterDupA === afterFirstA, `${afterFirstA} -> ${afterDupA}`);

  // --- (b) Individual: duplicate WEBHOOK delivery (separate payment) ---
  console.log("\n--- (b) individual, duplicate webhook delivery ---");
  const orderB = await postJson("/api/razorpay/create-order", A.cookieHeader, { quantity: 1 });
  assert("(b) create-order succeeds", orderB.status === 200, JSON.stringify(orderB.body));
  const paymentIdB = `pay_test_individual_webhook_${RUN_ID}`;
  const webhookEventB = {
    event: "payment.captured",
    payload: { payment: { entity: { id: paymentIdB, order_id: orderB.body.orderId, notes: { userId: A.userId, quantity: "1", credits: "999999" } } } },
  };
  const webhook1 = await postWebhookEvent(webhookEventB);
  assert("(b) first webhook delivery succeeds", webhook1.status === 200, JSON.stringify(webhook1.body));
  const afterWebhook1 = await getCredits(A.userId);
  assert(
    "(b) webhook grants CREDIT_PACK_CALLS (recomputed from quantity), ignoring the bogus notes.credits value",
    afterWebhook1 === afterDupA + CREDIT_PACK_CALLS,
    `${afterDupA} -> ${afterWebhook1}`
  );
  const webhook2 = await postWebhookEvent(webhookEventB);
  assert("(b) duplicate webhook delivery still returns ok", webhook2.status === 200, JSON.stringify(webhook2.body));
  const afterWebhook2 = await getCredits(A.userId);
  assert("(b) duplicate webhook delivery does not double-credit", afterWebhook2 === afterWebhook1, `${afterWebhook1} -> ${afterWebhook2}`);

  // --- Team setup ---
  console.log("\n--- setting up team (B owner, M1 non-owner member) ---");
  const { data: teamId, error: createTeamError } = await B.client.rpc("create_team", { p_name: `QA Razorpay Team ${RUN_ID}` });
  assert("create_team succeeds", !createTeamError && teamId, createTeamError?.message);
  cleanup.teamId = teamId;
  const { error: seedMemberError } = await admin
    .from("team_members")
    .insert({ team_id: teamId, user_id: M1.userId, role: "member", status: "active", consented_to_visibility: true, joined_at: new Date().toISOString() });
  assert("seed M1 as active member", !seedMemberError, seedMemberError?.message);

  // --- (c) Team purchase: 3 packs, via /verify ---
  console.log("\n--- (c) team owner buys 3 packs for the team pool ---");
  const baselineTeam = await getTeamCredits(teamId);
  const baselineOwnerPersonal = await getCredits(B.userId);

  const orderC = await postJson("/api/razorpay/create-order", B.cookieHeader, { quantity: 3, teamId });
  assert("(c) create-order succeeds for team purchase", orderC.status === 200, JSON.stringify(orderC.body));
  assert("(c) amount is 3x pack price", orderC.body.amount === CREDIT_PACK_PRICE_INR * 100 * 3, orderC.body.amount);

  const orderCNotes = (await razorpay.orders.fetch(orderC.body.orderId)).notes;
  assert(
    "(c) order notes carry teamId and quantity=3, credits=120",
    orderCNotes.teamId === teamId && orderCNotes.quantity === "3" && orderCNotes.credits === "120",
    JSON.stringify(orderCNotes)
  );

  const paymentIdC = `pay_test_team_${RUN_ID}`;
  const sigC = verifySignature(orderC.body.orderId, paymentIdC);
  const verifyC1 = await postJson("/api/razorpay/verify", B.cookieHeader, {
    razorpayOrderId: orderC.body.orderId,
    razorpayPaymentId: paymentIdC,
    razorpaySignature: sigC,
  });
  assert("(c) verify succeeds", verifyC1.status === 200, JSON.stringify(verifyC1.body));

  const afterTeamPurchase = await getTeamCredits(teamId);
  assert("(c) team pool increased by 3 * CREDIT_PACK_CALLS", afterTeamPurchase === baselineTeam + 3 * CREDIT_PACK_CALLS, `${baselineTeam} -> ${afterTeamPurchase}`);
  const ownerPersonalAfter = await getCredits(B.userId);
  assert("(c) owner's own personal credits_balance is unchanged", ownerPersonalAfter === baselineOwnerPersonal, `${baselineOwnerPersonal} -> ${ownerPersonalAfter}`);

  const verifyC2 = await postJson("/api/razorpay/verify", B.cookieHeader, {
    razorpayOrderId: orderC.body.orderId,
    razorpayPaymentId: paymentIdC,
    razorpaySignature: sigC,
  });
  assert("(c) duplicate verify still returns ok", verifyC2.status === 200, JSON.stringify(verifyC2.body));
  const afterTeamDup = await getTeamCredits(teamId);
  assert("(c) duplicate verify does not double-credit the team pool", afterTeamDup === afterTeamPurchase, `${afterTeamPurchase} -> ${afterTeamDup}`);

  // --- (c2) Team purchase via duplicate WEBHOOK delivery, 2 packs, bogus notes.credits ---
  console.log("\n--- team purchase, duplicate webhook delivery ---");
  const paymentIdC2 = `pay_test_team_webhook_${RUN_ID}`;
  const webhookEventC2 = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: { id: paymentIdC2, order_id: `order_fake_${RUN_ID}`, notes: { userId: B.userId, teamId, quantity: "2", credits: "999999" } },
      },
    },
  };
  const webhookC2a = await postWebhookEvent(webhookEventC2);
  assert("team webhook delivery succeeds", webhookC2a.status === 200, JSON.stringify(webhookC2a.body));
  const afterTeamWebhook1 = await getTeamCredits(teamId);
  assert(
    "team webhook grants 2 * CREDIT_PACK_CALLS (recomputed), ignoring bogus notes.credits",
    afterTeamWebhook1 === afterTeamDup + 2 * CREDIT_PACK_CALLS,
    `${afterTeamDup} -> ${afterTeamWebhook1}`
  );
  const webhookC2b = await postWebhookEvent(webhookEventC2);
  assert("duplicate team webhook delivery still returns ok", webhookC2b.status === 200, JSON.stringify(webhookC2b.body));
  const afterTeamWebhook2 = await getTeamCredits(teamId);
  assert("duplicate team webhook delivery does not double-credit", afterTeamWebhook2 === afterTeamWebhook1, `${afterTeamWebhook1} -> ${afterTeamWebhook2}`);

  // --- (d) Non-owner cannot buy into someone else's team ---
  console.log("\n--- (d) non-owner member cannot create-order for the team ---");
  const orderD = await postJson("/api/razorpay/create-order", M1.cookieHeader, { teamId });
  assert("(d) non-owner create-order is rejected (403)", orderD.status === 403 && orderD.body?.error === "not_authorized", JSON.stringify(orderD));

  // --- (e) Quantity bounds ---
  console.log("\n--- (e) quantity validation ---");
  const orderTooMany = await postJson("/api/razorpay/create-order", A.cookieHeader, { quantity: 21 });
  assert("(e) quantity=21 rejected (400)", orderTooMany.status === 400, JSON.stringify(orderTooMany));
  const orderTooFew = await postJson("/api/razorpay/create-order", A.cookieHeader, { quantity: 0 });
  assert("(e) quantity=0 rejected (400)", orderTooFew.status === 400, JSON.stringify(orderTooFew));
  const orderMax = await postJson("/api/razorpay/create-order", A.cookieHeader, { quantity: 20 });
  assert("(e) quantity=20 (upper bound) accepted", orderMax.status === 200, JSON.stringify(orderMax));

  // --- (f) Database-level cap is independent of the API layer ---
  console.log("\n--- (f) add_team_credits DB-level cap (defense in depth) ---");
  const { error: overCapError } = await admin.rpc("add_team_credits", {
    p_team_id: teamId,
    p_user_id: B.userId,
    p_credits: 801,
    p_provider: "manual",
  });
  assert("(f) 801 credits in one call is rejected at the DB layer", overCapError?.message === "credits_exceed_transaction_cap", overCapError?.message);

  console.log("\n=== all assertions passed ===\n");
}

async function cleanupAll() {
  console.log("\n--- cleanup ---");
  if (cleanup.teamId) {
    await admin.from("payment_transactions").delete().eq("team_id", cleanup.teamId);
    await admin.from("call_sessions").delete().eq("team_id", cleanup.teamId);
  }
  for (const userId of cleanup.userIds) {
    await admin.from("payment_transactions").delete().eq("user_id", userId);
    await admin.from("call_sessions").delete().eq("user_id", userId);
  }
  if (cleanup.teamId) {
    await admin.from("team_members").delete().eq("team_id", cleanup.teamId);
    await admin.from("team_invites").delete().eq("team_id", cleanup.teamId);
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

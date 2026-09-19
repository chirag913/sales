import { createHash } from "node:crypto";
import { NextRequest, NextResponse, after } from "next/server";
import { deliverLead } from "@/lib/leads/deliver";
import { notifyNewLead } from "@/lib/leads/notify";
import { cleanText, cleanUtm, validateLeadInput } from "@/lib/leads/schema";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

// Public landing-page lead capture. This route is reachable by anyone, so it
// never trusts the request:
//   - same-origin only (Origin header must match this host when present)
//   - small body cap, then full server-side validation and sanitization
//   - a hidden honeypot field and a minimum time-on-form check; bots that trip
//     either get a normal-looking success and NOTHING is stored
//   - per-IP rate limit (salted hash of the IP; the raw address is never stored)
//   - an identical (number + intent) submission in the last 10 minutes is a
//     no-op success, so a double-click or retry can't create duplicates
// The row is written with the service role, which stays on the server. RLS
// blocks every direct client access to the table (see migration 0019).

const MAX_BODY_BYTES = 10_000;
const MIN_FORM_TIME_MS = 2500;
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 60 * 60;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("x-real-ip") || "unknown";
  const salt = process.env.LEAD_RATE_LIMIT_SALT ?? "";
  return createHash("sha256").update(`${salt}|${ip}`).digest("hex").slice(0, 32);
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser client: still subject to everything else
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const OK = () => NextResponse.json({ ok: true });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }
  const text = await req.text().catch(() => "");
  if (text.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }
  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Bot traps: pretend it worked, store nothing.
  const honeypot = typeof body.hp === "string" ? body.hp.trim() : "";
  const openedAt = typeof body.openedAt === "number" ? body.openedAt : 0;
  const age = Date.now() - openedAt;
  if (honeypot || age < MIN_FORM_TIME_MS || age > MAX_FORM_AGE_MS) {
    return OK();
  }

  const result = validateLeadInput(body);
  if (!result.ok) {
    return NextResponse.json({ error: "Please check the highlighted fields.", errors: result.errors }, { status: 400 });
  }
  const lead = result.data;

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch (err) {
    console.error("leads: service role client unavailable", err);
    return NextResponse.json({ error: "We couldn't save your details right now. Please try again shortly." }, { status: 500 });
  }

  // Fails open on a database error: a transient outage shouldn't turn away
  // real leads, and the honeypot/validation layers above still apply.
  const { data: allowed, error: limitError } = await supabase.rpc("check_public_rate_limit", {
    p_key: `leads:${clientKey(req)}`,
    p_limit: RATE_LIMIT,
    p_window_seconds: RATE_WINDOW_SECONDS,
  });
  if (limitError) console.error("leads: rate limit check failed", limitError);
  else if (allowed === false) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  }

  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
  const { data: recent } = await supabase
    .from("landing_leads")
    .select("id")
    .eq("phone", lead.phone)
    .eq("intent", lead.intent)
    .gte("created_at", since)
    .limit(1);
  if (recent && recent.length > 0) return OK();

  const sourcePage = cleanText(body.sourcePage, 100) || null;
  const utm = cleanUtm(body.utm);

  const { data: inserted, error } = await supabase
    .from("landing_leads")
    .insert({
      name: lead.name,
      business_name: lead.businessName,
      phone: lead.phone,
      whatsapp: lead.whatsapp,
      what_they_sell: lead.whatTheySell,
      monthly_leads: lead.monthlyLeads,
      lead_sources: lead.leadSources,
      intent: lead.intent,
      source_page: sourcePage,
      utm,
    })
    .select("id, created_at")
    .single();

  if (error || !inserted) {
    console.error("leads: insert failed", error);
    return NextResponse.json({ error: "We couldn't save your details right now. Please try again shortly." }, { status: 500 });
  }

  // Best effort, after the response and only once the row is written: the lead
  // is already safely stored, so neither the webhook nor the email can lose it,
  // and neither can fail the submission (each catches and logs its own errors).
  const stored = { ...lead, id: inserted.id, createdAt: inserted.created_at, sourcePage, utm };
  after(async () => {
    await Promise.allSettled([deliverLead(stored), notifyNewLead(stored)]);
  });

  return OK();
}

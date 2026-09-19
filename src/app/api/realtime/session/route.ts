import { NextRequest, NextResponse, after } from "next/server";
import { pickVoiceForGender } from "@/lib/ai/models";
import { MAX_CALL_DURATION_SECONDS } from "@/lib/config/pricing";
import { normalizeTrainingProfile } from "@/lib/profile/normalize";
import { buildProspectPrompt } from "@/lib/prompts/buildProspectPrompt";
import { buildRealtimeSessionConfig } from "@/lib/realtime/sessionConfig";
import { CUTOFF_GRACE_MS, hangupProviderCall, markProviderHungUp, reapExpiredCalls } from "@/lib/realtime/serverCutoff";
import { checkRateLimit } from "@/lib/supabase/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { ProspectIdentity, Scenario, TrainingProfile } from "@/lib/types";

// The scheduled cutoff below (after()) keeps this invocation alive until it is
// time to hang the call up. 300s is the longest a Vercel function may run on
// the plans this app is deployed on (a higher value makes the DEPLOY fail even
// though the build passes), so the cutoff is scheduled to fire inside that
// window (see hangupAt below) and the backstop reaper (reapExpiredCalls, run
// on later requests) covers anything the platform ends earlier.
export const maxDuration = 300;

// Leave a few seconds of headroom before the platform's own limit.
const FUNCTION_LIMIT_MS = maxDuration * 1000 - 3_000;

const OPENAI_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

// The server brokers the WebRTC handshake instead of handing the browser an
// ephemeral key. That keeps the OpenAI credential off the client and, more
// importantly, gives the server the provider's call id, so it can hang the
// call up itself when the time cap is reached (a modified client can no
// longer keep the session alive by ignoring its own countdown).
export async function POST(req: NextRequest) {
  const requestStartedAt = Date.now();
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const offerSdp = typeof body?.offerSdp === "string" ? body.offerSdp : undefined;
  const storedProfile = body?.trainingProfile as TrainingProfile | undefined;
  const scenario = body?.scenario as Scenario | undefined;
  const identity = body?.identity as ProspectIdentity | undefined;

  if (!offerSdp || !storedProfile || !scenario || !identity) {
    return NextResponse.json({ error: "offerSdp, trainingProfile, scenario, and identity are required." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not set." }, { status: 500 });
  }

  // Not the main cost control (reserve_call_entitlement is) — just stops a
  // tight loop against this route. A real user can start well under 12 calls
  // an hour given the 5-minute cap.
  if (!(await checkRateLimit(supabase, "realtime/session", { limit: 30, windowSeconds: 60 * 60 }))) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  // Backstop for the scheduled cutoff: end any of this user's calls that are
  // past the cap but still alive at the provider.
  await reapExpiredCalls(userId, MAX_CALL_DURATION_SECONDS);

  // Reserve one trial call or paid credit BEFORE creating an expensive OpenAI
  // realtime session. This is an atomic, server-side DB operation — see
  // reserve_call_entitlement() in supabase/migrations/0003_entitlements.sql.
  const { data: reservation, error: reserveError } = await supabase
    .rpc("reserve_call_entitlement", {
      p_scenario: scenario,
      p_identity: identity,
      p_max_duration_seconds: MAX_CALL_DURATION_SECONDS,
    })
    .single();

  if (reserveError || !reservation) {
    if (reserveError?.message === "entitlement_required") {
      return NextResponse.json({ error: "entitlement_required" }, { status: 403 });
    }
    console.error("realtime/session: entitlement reservation failed", reserveError);
    return NextResponse.json({ error: "Failed to start call." }, { status: 500 });
  }

  const { call_id: callId } = reservation as { call_id: string; entitlement_type: string };

  try {
    const trainingProfile = normalizeTrainingProfile(storedProfile);
    const instructions = buildProspectPrompt(trainingProfile, scenario, identity);
    const voiceGender =
      identity.gender === "male" || identity.gender === "female" ? identity.gender : Math.random() < 0.5 ? "male" : "female";
    const voice = pickVoiceForGender(voiceGender, identity.fullName);

    // Plain string fields, NOT Blob/File parts: OpenAI rejects a part that
    // carries a filename ("field sdp is required but not found"). Verified
    // against the live endpoint with a real WebRTC offer.
    const form = new FormData();
    form.append("sdp", offerSdp);
    form.append("session", JSON.stringify(buildRealtimeSessionConfig({ instructions, voice })));

    const res = await fetch(OPENAI_CALLS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("realtime/session: OpenAI request failed", res.status, errBody);
      await supabase.rpc("release_call_entitlement", { p_call_id: callId });
      return NextResponse.json({ error: "Failed to start realtime session." }, { status: 502 });
    }

    const answerSdp = await res.text();
    // e.g. "/v1/realtime/calls/rtc_abc123"
    const providerCallId = res.headers.get("location")?.split("/").pop() ?? null;

    await supabase.rpc("mark_call_started", { p_call_id: callId });
    if (providerCallId) {
      await supabase.rpc("attach_provider_call", { p_call_id: callId, p_provider_call_id: providerCallId });
    } else {
      console.error("realtime/session: no call id in OpenAI response; server cutoff unavailable for", callId);
    }

    const deadlineMs = Date.now() + MAX_CALL_DURATION_SECONDS * 1000;
    if (providerCallId) {
      // The call is capped at MAX_CALL_DURATION_SECONDS plus a grace period, but
      // this function can't outlive its own limit, so the hangup fires at
      // whichever comes first. That can be up to a few seconds before the
      // client's own countdown ends; the reaper backstop handles the rest.
      const hangupAt = Math.min(deadlineMs + CUTOFF_GRACE_MS, requestStartedAt + FUNCTION_LIMIT_MS);
      after(async () => {
        const wait = hangupAt - Date.now();
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        await hangupProviderCall(providerCallId);
        await markProviderHungUp(callId);
      });
    }

    return NextResponse.json({ answerSdp, callId, deadlineAt: new Date(deadlineMs).toISOString() });
  } catch (err) {
    console.error("realtime/session failed", err);
    await supabase.rpc("release_call_entitlement", { p_call_id: callId });
    return NextResponse.json({ error: "Failed to start realtime session." }, { status: 500 });
  }
}

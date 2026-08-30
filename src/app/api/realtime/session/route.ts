import { NextRequest, NextResponse } from "next/server";
import { REALTIME_MODEL, REALTIME_TRANSCRIBE_MODEL, pickVoiceForGender } from "@/lib/ai/models";
import { MAX_CALL_DURATION_SECONDS } from "@/lib/config/pricing";
import { buildProspectPrompt } from "@/lib/prompts/buildProspectPrompt";
import { createClient } from "@/lib/supabase/server";
import { getProspectLanguage, ProspectIdentity, SalesProfile, Scenario, TrainingProfile } from "@/lib/types";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const salesProfile = body?.salesProfile as SalesProfile | undefined;
  const trainingProfile = body?.trainingProfile as TrainingProfile | undefined;
  const scenario = body?.scenario as Scenario | undefined;
  const identity = body?.identity as ProspectIdentity | undefined;

  if (!salesProfile || !trainingProfile || !scenario || !identity) {
    return NextResponse.json(
      { error: "salesProfile, trainingProfile, scenario, and identity are required." },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not set." }, { status: 500 });
  }

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

  const instructions = buildProspectPrompt(salesProfile, trainingProfile, scenario, identity);
  // Without a language hint, Whisper-family transcription models frequently
  // mistake spoken Hindi for Urdu — acoustically near-identical spoken
  // languages ("Hindustani") that use completely different scripts — and
  // transcribe in Perso-Arabic script instead of Devanagari. Same
  // market/language check buildProspectPrompt.ts uses for the prospect's
  // own speech; English-market calls get no language hint at all, same as
  // before. There is no supported way to request romanized/Latin output
  // instead of Devanagari for Hindi — OpenAI's transcription models don't
  // offer that, with or without this hint.
  const isHinglishCall = getProspectLanguage(trainingProfile.market) === "hinglish";
  const voiceGender =
    identity.gender === "male" || identity.gender === "female"
      ? identity.gender
      : Math.random() < 0.5
        ? "male"
        : "female";
  const voice = pickVoiceForGender(voiceGender);

  try {
    const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: REALTIME_MODEL,
          instructions,
          audio: {
            input: {
              transcription: {
                model: REALTIME_TRANSCRIBE_MODEL,
                ...(isHinglishCall ? { language: "hi" } : {}),
              },
              turn_detection: {
                type: "server_vad",
                interrupt_response: true,
                // Defaults (silence_duration_ms: 500, prefix_padding_ms: 300) were
                // splitting a single utterance into two conversation items on a
                // brief mid-sentence pause, and clipping the first syllable at the
                // start of a turn. Widened both to reduce false turn-ends and give
                // more lead-in audio before the detected speech start.
                silence_duration_ms: 750,
                prefix_padding_ms: 500,
                // Default threshold (0.5) picks up steady ambient noise (fan hum,
                // room noise) as "speech started" — since interrupt_response is on,
                // that falsely cuts the prospect off mid-response and can leave the
                // turn stuck waiting for the (noise-sustained) "silence" that never
                // comes. 0.7 alone wasn't enough against real fan noise in testing;
                // paired with noiseSuppression on the mic track (useRealtimeCall.ts)
                // which should also make real speech register more cleanly.
                threshold: 0.8,
              },
            },
            output: {
              voice,
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("realtime/session: OpenAI request failed", res.status, errBody);
      await supabase.rpc("release_call_entitlement", { p_call_id: callId });
      return NextResponse.json({ error: "Failed to start realtime session." }, { status: 502 });
    }

    const data = (await res.json()) as { value: string; expires_at: number };

    await supabase.rpc("mark_call_started", { p_call_id: callId });
    const deadlineAt = new Date(Date.now() + MAX_CALL_DURATION_SECONDS * 1000).toISOString();

    return NextResponse.json({ value: data.value, expiresAt: data.expires_at, callId, deadlineAt });
  } catch (err) {
    console.error("realtime/session failed", err);
    await supabase.rpc("release_call_entitlement", { p_call_id: callId });
    return NextResponse.json({ error: "Failed to start realtime session." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { REALTIME_MODEL, REALTIME_TRANSCRIBE_MODEL, REALTIME_VOICE } from "@/lib/ai/models";
import { buildProspectPrompt } from "@/lib/prompts/buildProspectPrompt";
import { ProspectIdentity, SalesProfile, Scenario, TrainingProfile } from "@/lib/types";

export async function POST(req: NextRequest) {
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

  const instructions = buildProspectPrompt(salesProfile, trainingProfile, scenario, identity);

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
              transcription: { model: REALTIME_TRANSCRIBE_MODEL },
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
              },
            },
            output: {
              voice: REALTIME_VOICE,
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("realtime/session: OpenAI request failed", res.status, errBody);
      return NextResponse.json({ error: "Failed to start realtime session." }, { status: 502 });
    }

    const data = (await res.json()) as { value: string; expires_at: number };
    return NextResponse.json({ value: data.value, expiresAt: data.expires_at });
  } catch (err) {
    console.error("realtime/session failed", err);
    return NextResponse.json({ error: "Failed to start realtime session." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { tagObjections } from "@/lib/ai/objectionTags";
import { createClient } from "@/lib/supabase/server";
import { CallScoreResult, ProspectIdentity, Scenario, TranscriptEntry } from "@/lib/types";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const scenario = body?.scenario as Scenario | undefined;
  const identity = body?.identity as ProspectIdentity | undefined;
  const durationSeconds = typeof body?.durationSeconds === "number" ? body.durationSeconds : undefined;
  const result = body?.result as CallScoreResult | undefined;
  const transcript = body?.transcript as TranscriptEntry[] | undefined;

  if (!scenario || !identity || durationSeconds === undefined || !result || !transcript) {
    return NextResponse.json(
      { error: "scenario, identity, durationSeconds, result, and transcript are required." },
      { status: 400 }
    );
  }

  try {
    const transcriptText = transcript
      .filter((entry) => entry.final)
      .map((entry) => `${entry.role === "user" ? "Caller" : "Prospect"}: ${entry.text}`)
      .join("\n");
    const objectionTags = await tagObjections(transcriptText);

    const { error } = await supabase.from("calls").insert({
      user_id: userId,
      scenario,
      identity,
      duration_seconds: durationSeconds,
      overall_score: result.overallScore,
      categories: result.categories,
      metrics: result.metrics,
      biggest_mistake: result.biggestMistake,
      best_moment: result.bestMoment,
      better_responses: result.betterResponses,
      transcript,
      objection_tags: objectionTags,
    });

    if (error) {
      console.error("calls/save: insert failed", error);
      return NextResponse.json({ error: "Failed to save call." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("calls/save failed", err);
    return NextResponse.json({ error: "Failed to save call." }, { status: 500 });
  }
}

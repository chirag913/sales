import { NextRequest, NextResponse } from "next/server";
import { CallEndedBy, generateCallScore } from "@/lib/ai/score";
import { computeTranscriptMetrics } from "@/lib/scoring/metrics";
import { checkRateLimit } from "@/lib/supabase/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { scorableTranscript } from "@/lib/transcript";
import { CallScoreResult, SalesProfile, Scenario, TranscriptEntry, TrainingProfile } from "@/lib/types";

const ENDED_BY_VALUES: CallEndedBy[] = ["caller", "prospect", "timeout"];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const callId = typeof body?.callId === "string" ? body.callId : undefined;
  const rawTranscript = body?.transcript as TranscriptEntry[] | undefined;
  const salesProfile = body?.salesProfile as SalesProfile | undefined;
  const trainingProfile = body?.trainingProfile as TrainingProfile | undefined;
  const scenario = body?.scenario as Scenario | undefined;
  const durationSeconds = typeof body?.durationSeconds === "number" ? body.durationSeconds : 0;
  const endedBy: CallEndedBy = ENDED_BY_VALUES.includes(body?.endedBy) ? body.endedBy : "caller";
  const prospectEndReason = typeof body?.prospectEndReason === "string" ? body.prospectEndReason : undefined;

  if (!callId || !rawTranscript || !salesProfile || !trainingProfile || !scenario) {
    return NextResponse.json(
      { error: "callId, transcript, salesProfile, trainingProfile, and scenario are required." },
      { status: 400 }
    );
  }

  // Only what was actually finished and heard is scored: unfinished turns and
  // prospect replies the caller cut off are dropped.
  const transcript = scorableTranscript(rawTranscript);
  if (!transcript.some((entry) => entry.role === "user")) {
    return NextResponse.json({ error: "We didn't pick up any speech from you on this call, so there's nothing to score." }, { status: 400 });
  }

  // This calls OpenAI, so it must be tied to a call the user actually
  // reserved (and therefore paid a trial/credit for) — otherwise any
  // authenticated account, regardless of remaining balance, could spam this
  // route directly to run up OpenAI cost for free. RLS scopes the select to
  // the caller's own rows, so a callId belonging to another user simply
  // won't be found here. The row stays 'started' until /api/calls/save
  // finalizes it, which is what lets a failed scoring attempt be retried
  // without spending another call.
  const { data: session } = await supabase
    .from("call_sessions")
    .select("id")
    .eq("id", callId)
    .eq("status", "started")
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "No active call session." }, { status: 403 });
  }

  // Generous enough for a few retries per call; stops a scripted loop.
  if (!(await checkRateLimit(supabase, "score/generate", { limit: 30, windowSeconds: 60 * 60 }))) {
    return NextResponse.json({ error: "Too many scoring requests. Please wait a bit and try again." }, { status: 429 });
  }

  try {
    const computed = computeTranscriptMetrics(transcript);
    const ai = await generateCallScore({
      transcript,
      salesProfile,
      trainingProfile,
      scenario,
      durationSeconds,
      metrics: computed,
      endedBy,
      prospectEndReason,
    });

    const overallScore = ai.categories.reduce((sum, c) => sum + c.score, 0);

    const result: CallScoreResult = {
      overallScore,
      categories: ai.categories,
      metrics: {
        durationSeconds,
        questionCount: computed.questionCount,
        userWordCount: computed.userWordCount,
        prospectWordCount: computed.prospectWordCount,
        userSpeakingPercent: computed.userSpeakingPercent,
        prospectSpeakingPercent: computed.prospectSpeakingPercent,
        longestUserMonologueWords: computed.longestUserMonologueWords,
        objectionCount: ai.objectionCount,
        objectionsHandled: ai.objectionsHandled,
        missedBuyingSignals: ai.missedBuyingSignals,
        pitchCount: ai.pitchCount,
        nextStepAskCount: ai.nextStepAskCount,
      },
      biggestMistake: ai.biggestMistake,
      bestMoment: ai.bestMoment,
      betterResponses: ai.betterResponses,
      objectiveOutcome: ai.objectiveOutcome,
      workOnNext: ai.workOnNext,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("score/generate failed", err);
    return NextResponse.json({ error: "Failed to score the call." }, { status: 500 });
  }
}

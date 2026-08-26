import { NextRequest, NextResponse } from "next/server";
import { generateCallScore } from "@/lib/ai/score";
import { computeTranscriptMetrics } from "@/lib/scoring/metrics";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import { CallScoreResult, SalesProfile, Scenario, TranscriptEntry, TrainingProfile } from "@/lib/types";

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const transcript = body?.transcript as TranscriptEntry[] | undefined;
  const salesProfile = body?.salesProfile as SalesProfile | undefined;
  const trainingProfile = body?.trainingProfile as TrainingProfile | undefined;
  const scenario = body?.scenario as Scenario | undefined;
  const durationSeconds = typeof body?.durationSeconds === "number" ? body.durationSeconds : 0;

  if (!transcript || !salesProfile || !trainingProfile || !scenario) {
    return NextResponse.json(
      { error: "transcript, salesProfile, trainingProfile, and scenario are required." },
      { status: 400 }
    );
  }

  if (transcript.length === 0) {
    return NextResponse.json({ error: "This call had no conversation to score." }, { status: 400 });
  }

  try {
    const computed = computeTranscriptMetrics(transcript);
    const ai = await generateCallScore({ transcript, salesProfile, trainingProfile, scenario });

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
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("score/generate failed", err);
    return NextResponse.json({ error: "Failed to score the call." }, { status: 500 });
  }
}

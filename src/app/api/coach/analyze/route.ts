import { NextRequest, NextResponse } from "next/server";
import { analyzeTranscript } from "@/lib/ai/coach";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import { SalesProfile, TranscriptEntry, TrainingProfile } from "@/lib/types";

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const transcript = body?.transcript as TranscriptEntry[] | undefined;
  const salesProfile = body?.salesProfile as SalesProfile | undefined;
  const trainingProfile = body?.trainingProfile as TrainingProfile | undefined;

  if (!transcript || !salesProfile || !trainingProfile) {
    return NextResponse.json(
      { error: "transcript, salesProfile, and trainingProfile are required." },
      { status: 400 }
    );
  }

  if (transcript.length === 0) {
    return NextResponse.json({ hasTip: false, tip: null });
  }

  const transcriptText = transcript
    .map((entry) => `${entry.role === "user" ? "Caller" : "Prospect"}: ${entry.text}`)
    .join("\n");

  try {
    const tip = await analyzeTranscript({ transcriptText, salesProfile, trainingProfile });
    return NextResponse.json({ hasTip: tip !== null, tip });
  } catch (err) {
    console.error("coach/analyze failed", err);
    return NextResponse.json({ error: "Failed to analyze transcript." }, { status: 500 });
  }
}

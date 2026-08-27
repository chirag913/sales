import { NextRequest, NextResponse } from "next/server";
import { analyzeTranscript } from "@/lib/ai/coach";
import { createClient } from "@/lib/supabase/server";
import { SalesProfile, TranscriptEntry, TrainingProfile } from "@/lib/types";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const callId = typeof body?.callId === "string" ? body.callId : undefined;
  const transcript = body?.transcript as TranscriptEntry[] | undefined;
  const salesProfile = body?.salesProfile as SalesProfile | undefined;
  const trainingProfile = body?.trainingProfile as TrainingProfile | undefined;

  if (!callId || !transcript || !salesProfile || !trainingProfile) {
    return NextResponse.json(
      { error: "callId, transcript, salesProfile, and trainingProfile are required." },
      { status: 400 }
    );
  }

  if (transcript.length === 0) {
    return NextResponse.json({ hasTip: false, tip: null });
  }

  // Called repeatedly during a live call, so this must be tied to a call the
  // user actually reserved — otherwise any authenticated account could spam
  // this route directly to run up OpenAI cost for free, with no connection
  // to their credit/trial balance at all. RLS scopes the select to the
  // caller's own rows, so a callId belonging to another user won't be found.
  const { data: session } = await supabase
    .from("call_sessions")
    .select("id")
    .eq("id", callId)
    .eq("status", "started")
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "No active call session." }, { status: 403 });
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

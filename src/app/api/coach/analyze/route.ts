import { NextRequest, NextResponse } from "next/server";
import { analyzeTranscript } from "@/lib/ai/coach";
import { checkRateLimit } from "@/lib/supabase/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { transcriptToText } from "@/lib/transcript";
import { SalesProfile, Scenario, TranscriptEntry, TrainingProfile } from "@/lib/types";

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
  const scenario = body?.scenario as Scenario | undefined;

  if (!callId || !transcript || !salesProfile || !trainingProfile || !scenario) {
    return NextResponse.json(
      { error: "callId, transcript, salesProfile, trainingProfile, and scenario are required." },
      { status: 400 }
    );
  }

  const transcriptText = transcriptToText(transcript);
  if (!transcriptText) {
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

  // The client already throttles to roughly one analysis every 7 seconds
  // (~43 in a full 5-minute call); this ceiling is only for a client that
  // ignores that, so it sits well above legitimate use.
  if (!(await checkRateLimit(supabase, "coach/analyze", { limit: 80, windowSeconds: 5 * 60 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const tip = await analyzeTranscript({ transcriptText, salesProfile, trainingProfile, scenario });
    return NextResponse.json({ hasTip: tip !== null, tip });
  } catch (err) {
    console.error("coach/analyze failed", err);
    return NextResponse.json({ error: "Failed to analyze transcript." }, { status: 500 });
  }
}

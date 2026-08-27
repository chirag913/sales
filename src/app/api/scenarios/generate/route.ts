import { NextRequest, NextResponse } from "next/server";
import { generateScenarios } from "@/lib/ai/scenarios";
import { checkRateLimit } from "@/lib/supabase/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { TrainingProfile } from "@/lib/types";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!(await checkRateLimit(supabase, "scenarios/generate"))) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const profile = body?.profile as TrainingProfile | undefined;

  if (!profile) {
    return NextResponse.json({ error: "Profile is required." }, { status: 400 });
  }

  try {
    const scenarios = await generateScenarios(profile);
    return NextResponse.json(scenarios);
  } catch (err) {
    console.error("scenarios/generate failed", err);
    return NextResponse.json({ error: "Failed to generate scenarios." }, { status: 500 });
  }
}

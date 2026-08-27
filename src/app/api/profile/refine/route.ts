import { NextRequest, NextResponse } from "next/server";
import { refineTrainingProfile } from "@/lib/ai/profile";
import { checkRateLimit } from "@/lib/supabase/rateLimit";
import { createClient } from "@/lib/supabase/server";
import { TrainingProfile } from "@/lib/types";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!(await checkRateLimit(supabase, "profile/refine"))) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const profile = body?.profile as TrainingProfile | undefined;
  const instruction = typeof body?.instruction === "string" ? body.instruction.trim() : "";

  if (!profile || !instruction) {
    return NextResponse.json({ error: "Profile and instruction are required." }, { status: 400 });
  }

  try {
    const updated = await refineTrainingProfile(profile, instruction);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("profile/refine failed", err);
    return NextResponse.json({ error: "Failed to update training profile." }, { status: 500 });
  }
}

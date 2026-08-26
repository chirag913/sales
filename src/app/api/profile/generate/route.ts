import { NextRequest, NextResponse } from "next/server";
import { generateTrainingProfile } from "@/lib/ai/profile";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const context = typeof body?.context === "string" ? body.context.trim() : "";
  const market = typeof body?.market === "string" ? body.market : "US";

  if (!description) {
    return NextResponse.json({ error: "Description is required." }, { status: 400 });
  }

  try {
    const profile = await generateTrainingProfile({ description, context, market });
    return NextResponse.json(profile);
  } catch (err) {
    console.error("profile/generate failed", err);
    return NextResponse.json({ error: "Failed to generate training profile." }, { status: 500 });
  }
}

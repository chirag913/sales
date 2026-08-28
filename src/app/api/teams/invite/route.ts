import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Owner-only (enforced inside invite_to_team itself — this route doesn't
// separately re-check ownership since the RPC's own check is the real
// authority). Creates the invite row and returns a shareable link — no
// email is sent, there's no transactional email provider in this codebase.
// The owner copies/sends the link manually.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const teamId = typeof body?.teamId === "string" ? body.teamId : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!teamId || !email) {
    return NextResponse.json({ error: "teamId and email are required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .rpc("invite_to_team", { p_team_id: teamId, p_email: email })
    .single();

  if (error || !data) {
    if (error?.message === "not_authorized") {
      return NextResponse.json({ error: "not_authorized" }, { status: 403 });
    }
    if (error?.message === "invalid_email") {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }
    console.error("teams/invite: rpc failed", error);
    return NextResponse.json({ error: "Failed to create invite." }, { status: 500 });
  }

  const { token } = data as { id: string; token: string };
  const origin = req.nextUrl.origin;

  return NextResponse.json({ inviteUrl: `${origin}/accept-invite?token=${token}` });
}

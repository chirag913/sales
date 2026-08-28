import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Owner-only (enforced inside remove_team_member itself).
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const teamId = typeof body?.teamId === "string" ? body.teamId : "";
  const userId = typeof body?.userId === "string" ? body.userId : "";
  if (!teamId || !userId) {
    return NextResponse.json({ error: "teamId and userId are required." }, { status: 400 });
  }

  const { error } = await supabase.rpc("remove_team_member", { p_team_id: teamId, p_user_id: userId });

  if (error) {
    if (error.message === "not_authorized" || error.message === "cannot_remove_owner") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("teams/remove-member: rpc failed", error);
    return NextResponse.json({ error: "Failed to remove member." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

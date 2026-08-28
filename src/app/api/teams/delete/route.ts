import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Owner-only (enforced inside delete_team itself — verified via
// teams.owner_id = auth.uid(), same pattern as remove_team_member/
// invite_to_team).
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const teamId = typeof body?.teamId === "string" ? body.teamId : "";
  if (!teamId) {
    return NextResponse.json({ error: "teamId is required." }, { status: 400 });
  }

  const { error } = await supabase.rpc("delete_team", { p_team_id: teamId });

  if (error) {
    if (error.message === "not_authorized") {
      return NextResponse.json({ error: "not_authorized" }, { status: 403 });
    }
    console.error("teams/delete: rpc failed", error);
    return NextResponse.json({ error: "Failed to delete team." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

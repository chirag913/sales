import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// No body — leave_team() derives the leaving user from auth.uid() itself,
// so there's no userId/teamId to trust from the client here at all.
export async function POST() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { error } = await supabase.rpc("leave_team");

  if (error) {
    if (error.message === "not_on_a_team") {
      return NextResponse.json({ error: "not_on_a_team", message: "You're not on a team." }, { status: 400 });
    }
    if (error.message === "owner_cannot_leave") {
      return NextResponse.json(
        {
          error: "owner_cannot_leave",
          message: "As the owner, you can't leave — delete the team instead if you want to close it.",
        },
        { status: 403 }
      );
    }
    console.error("teams/leave: rpc failed", error);
    return NextResponse.json({ error: "Failed to leave team." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

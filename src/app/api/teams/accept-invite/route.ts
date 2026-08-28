import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { InvitePreview } from "@/lib/team/types";

// Unauthenticated-safe preview — get_invite_preview() is the one function
// in supabase/migrations/0013_teams.sql granted to anon, deliberately, so
// a visitor can see "You're invited to join Team X" before signing in.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invite_preview", { p_token: token }).single();

  if (error || !data) {
    console.error("teams/accept-invite GET: rpc failed", error);
    return NextResponse.json({ error: "Failed to load invite." }, { status: 500 });
  }

  const row = data as { team_name: string | null; email: string | null; valid: boolean };
  const preview: InvitePreview = { valid: row.valid, teamName: row.team_name, email: row.email };
  return NextResponse.json(preview);
}

// Creates the team_members row IF AND ONLY IF the caller explicitly
// consented on the dedicated screen (src/components/team/AcceptInviteScreen.tsx)
// — this route re-checks consent === true server-side too, rather than
// trusting the client to only ever send true, matching this codebase's
// existing belt-and-suspenders style (e.g. reserve_call_entitlement never
// trusts a client-supplied entitlement decision either).
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const consent = body?.consent === true;

  if (!token) {
    return NextResponse.json({ error: "token is required." }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ error: "consent_required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .rpc("accept_team_invite", { p_token: token, p_consent: true })
    .single();

  if (error || !data) {
    const known = ["invite_invalid_or_expired", "email_mismatch", "already_on_a_team", "consent_required"];
    if (error && known.includes(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("teams/accept-invite POST: rpc failed", error);
    return NextResponse.json({ error: "Failed to accept invite." }, { status: 500 });
  }

  const { team_id: teamId, team_name: teamName } = data as { team_id: string; team_name: string };
  return NextResponse.json({ teamId, teamName });
}

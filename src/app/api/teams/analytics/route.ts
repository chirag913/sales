import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TeamMemberAnalytics } from "@/lib/team/types";

// Owner-only, same pattern as GET /api/teams/mine: check the caller owns a
// team (RLS-scoped select on teams) before calling the RPC, even though
// get_team_member_analytics() also enforces this itself — belt-and-
// suspenders, matching the rest of this codebase's routes.
export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const userId = authData.claims.sub as string;

  const { data: ownedTeam } = await supabase.from("teams").select("id").eq("owner_id", userId).maybeSingle();
  if (!ownedTeam) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  const { data, error } = await supabase.rpc("get_team_member_analytics", { p_team_id: ownedTeam.id });

  if (error) {
    console.error("teams/analytics: rpc failed", error);
    return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 });
  }

  type Row = {
    user_id: string;
    email: string;
    total_calls: number;
    avg_overall_score: number | null;
    last_call_at: string | null;
    top_objection_tags: string[] | null;
  };

  const members: TeamMemberAnalytics[] = ((data ?? []) as Row[]).map((row) => ({
    userId: row.user_id,
    email: row.email,
    totalCalls: row.total_calls,
    avgOverallScore: row.avg_overall_score,
    lastCallAt: row.last_call_at,
    topObjectionTags: row.top_objection_tags ?? [],
  }));

  return NextResponse.json({ members });
}

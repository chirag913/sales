import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MyTeamResponse, TeamInviteRow, TeamMemberRow } from "@/lib/team/types";

// Role-branches: an owner gets the full roster + pending invites + pooled
// balance (get_owned_team_overview). A plain member gets only their own
// {teamId, teamName, role, status} — deliberately narrower than what the
// team_members RLS policy itself would allow (a member can query
// team_members directly via supabase-js and see every row for their team:
// uuids/role/status, not email since that needs an auth.users join plain
// `authenticated` can't do). That RLS policy is the actual privacy
// boundary; this route's narrowness is a UX minimization on top of it, not
// a security control — don't "fix" the RLS policy to match this route.
export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const userId = authData.claims.sub as string;

  const { data: ownedTeam } = await supabase
    .from("teams")
    .select("id, name, credits_balance")
    .eq("owner_id", userId)
    .maybeSingle();

  if (ownedTeam) {
    const { data: rows, error } = await supabase.rpc("get_owned_team_overview", { p_team_id: ownedTeam.id });

    if (error) {
      console.error("teams/mine: get_owned_team_overview failed", error);
      return NextResponse.json({ error: "Failed to load team." }, { status: 500 });
    }

    type OverviewRow = {
      team_name: string;
      credits_balance: number;
      member_user_id: string | null;
      member_email: string | null;
      member_role: "owner" | "member" | null;
      member_status: "invited" | "active" | null;
      member_joined_at: string | null;
      invite_email: string | null;
      invite_status: "pending" | "accepted" | "expired" | null;
      invite_expires_at: string | null;
    };

    const members: TeamMemberRow[] = [];
    const invites: TeamInviteRow[] = [];
    for (const row of (rows ?? []) as OverviewRow[]) {
      if (row.member_user_id) {
        members.push({
          userId: row.member_user_id,
          email: row.member_email ?? "",
          role: row.member_role ?? "member",
          status: row.member_status ?? "active",
          joinedAt: row.member_joined_at,
        });
      } else if (row.invite_email) {
        invites.push({
          email: row.invite_email,
          status: row.invite_status ?? "pending",
          expiresAt: row.invite_expires_at ?? "",
        });
      }
    }

    const response: MyTeamResponse = {
      role: "owner",
      teamId: ownedTeam.id,
      teamName: ownedTeam.name,
      creditsBalance: ownedTeam.credits_balance,
      members,
      invites,
    };
    return NextResponse.json(response);
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (membership) {
    const { data: team } = await supabase.from("teams").select("name").eq("id", membership.team_id).maybeSingle();

    const response: MyTeamResponse = {
      role: "member",
      teamId: membership.team_id,
      teamName: team?.name ?? "",
      status: membership.status,
    };
    return NextResponse.json(response);
  }

  const response: MyTeamResponse = { role: null };
  return NextResponse.json(response);
}

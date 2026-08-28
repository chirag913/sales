export interface TeamMemberRow {
  userId: string;
  email: string;
  role: "owner" | "member";
  status: "invited" | "active";
  joinedAt: string | null;
}

export interface TeamInviteRow {
  email: string;
  status: "pending" | "accepted" | "expired";
  expiresAt: string;
}

// GET /api/teams/mine response when the caller owns the team.
export interface OwnedTeamOverview {
  role: "owner";
  teamId: string;
  teamName: string;
  creditsBalance: number;
  members: TeamMemberRow[];
  invites: TeamInviteRow[];
}

// GET /api/teams/mine response when the caller is a plain member —
// deliberately narrower than what RLS would allow (see route comment).
export interface MemberTeamSummary {
  role: "member";
  teamId: string;
  teamName: string;
  status: "invited" | "active";
}

export type MyTeamResponse = OwnedTeamOverview | MemberTeamSummary | { role: null };

export interface InvitePreview {
  valid: boolean;
  teamName: string | null;
  email: string | null;
}

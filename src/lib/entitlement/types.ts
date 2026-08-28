// Mirrors get_entitlement_status()'s return shape (supabase/migrations/0003_entitlements.sql).
// This is purely a UI convenience — the server/database remains the
// authoritative source; the client never derives call permission itself.
export interface EntitlementStatus {
  trialCallsUsed: number;
  trialCallsLimit: number;
  credits: number;
  trialRemaining: number;
  canStartCall: boolean;
  isAdmin: boolean;
  // isTeamMember=true means calls draw from teamCredits, not credits —
  // credits is still the personal balance, but reserve_call_entitlement
  // never consults it while the user is on a team. See
  // supabase/migrations/0013_teams.sql.
  isTeamMember: boolean;
  teamName: string | null;
  teamCredits: number | null;
}

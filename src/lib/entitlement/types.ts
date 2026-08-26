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
}

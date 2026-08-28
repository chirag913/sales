// Team-analytics readiness signal (src/components/team/TeamSection.tsx) — a
// team member is considered "ready" once they've practiced enough calls at
// a high enough average score. Computed client-side from
// get_team_member_analytics()'s raw numbers (supabase/migrations/
// 0014_team_analytics.sql) rather than baked into the SQL function, so the
// threshold can be tuned later without a migration.
export const READINESS_MIN_CALLS = 10;
export const READINESS_MIN_AVG_SCORE = 70;

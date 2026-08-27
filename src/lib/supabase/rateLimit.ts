import { SupabaseClient } from "@supabase/supabase-js";

// Generous — meant to stop scripted abuse, not slow down real onboarding
// (a real user hits profile/generate, profile/refine, and scenarios/generate
// at most a handful of times per session).
const REQUESTS_PER_HOUR = 20;
const WINDOW_SECONDS = 60 * 60;

// Backed by check_rate_limit() in supabase/migrations/0009_rate_limits.sql —
// atomic (row-locked upsert) per (user, route) fixed window. Fails open on
// an unexpected RPC error so a transient DB hiccup can't block real usage;
// the routes calling this are already the least security-critical ones
// (cost containment, not access control).
export async function checkRateLimit(supabase: SupabaseClient, route: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_route: route,
    p_limit: REQUESTS_PER_HOUR,
    p_window_seconds: WINDOW_SECONDS,
  });
  if (error) {
    console.error(`rate limit check failed for ${route}`, error);
    return true;
  }
  return data === true;
}

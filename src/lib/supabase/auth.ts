import { createClient } from "@/lib/supabase/server";

// Shared auth check for Route Handlers — every route that spends OpenAI
// tokens or touches user data must call this before doing any work.
export async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

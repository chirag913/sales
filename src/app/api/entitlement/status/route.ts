import { NextResponse } from "next/server";
import { MAX_CALL_DURATION_SECONDS } from "@/lib/config/pricing";
import { EntitlementStatus } from "@/lib/entitlement/types";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data, error } = await supabase
    .rpc("get_entitlement_status", { p_max_duration_seconds: MAX_CALL_DURATION_SECONDS })
    .single();

  if (error || !data) {
    console.error("entitlement/status: rpc failed", error);
    return NextResponse.json({ error: "Failed to load entitlement status." }, { status: 500 });
  }

  const row = data as {
    trial_calls_used: number;
    trial_calls_limit: number;
    credits: number;
    trial_remaining: number;
    can_start_call: boolean;
    is_admin: boolean;
    is_team_member: boolean;
    team_name: string | null;
    team_credits: number | null;
  };

  const status: EntitlementStatus = {
    trialCallsUsed: row.trial_calls_used,
    trialCallsLimit: row.trial_calls_limit,
    credits: row.credits,
    trialRemaining: row.trial_remaining,
    canStartCall: row.can_start_call,
    isAdmin: row.is_admin,
    isTeamMember: row.is_team_member,
    teamName: row.team_name,
    teamCredits: row.team_credits,
  };

  return NextResponse.json(status);
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// toggle_admin_status() re-checks is_admin itself (SECURITY DEFINER, same
// pattern as every other privileged function in this codebase) — this route
// still confirms the caller has a real session first, belt and suspenders,
// rather than letting the client call the RPC directly with no server-side
// re-verification.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const targetUserId = typeof body?.targetUserId === "string" ? body.targetUserId : undefined;
  if (!targetUserId) {
    return NextResponse.json({ error: "targetUserId is required." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("toggle_admin_status", { p_target_user_id: targetUserId });

  if (error) {
    if (error.message.includes("not_authorized")) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }
    if (error.message.includes("cannot_remove_last_admin")) {
      return NextResponse.json({ error: "Cannot remove the last remaining admin." }, { status: 400 });
    }
    if (error.message.includes("user_not_found")) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    console.error("admin/toggle-admin failed", error);
    return NextResponse.json({ error: "Failed to update admin status." }, { status: 500 });
  }

  return NextResponse.json({ isAdmin: data as boolean });
}

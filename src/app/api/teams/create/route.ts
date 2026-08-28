import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("create_team", { p_name: name });

  if (error) {
    if (error.message === "already_on_a_team") {
      return NextResponse.json({ error: "already_on_a_team" }, { status: 409 });
    }
    console.error("teams/create: rpc failed", error);
    return NextResponse.json({ error: "Failed to create team." }, { status: 500 });
  }

  return NextResponse.json({ teamId: data as string });
}

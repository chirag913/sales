import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/server";

// No distinct "forbidden" page — a non-admin (or logged-out) visitor just
// gets sent to / like /admin doesn't exist for them. The lighter direct
// users_profile check (rather than get_entitlement_status, which is about
// trial/credit state, not admin access) is enough here: every real
// privileged read/write still goes through its own SECURITY DEFINER
// function with its own admin check — this is only the page-gate.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims) redirect("/");

  const { data: profile } = await supabase
    .from("users_profile")
    .select("is_admin")
    .eq("id", authData.claims.sub)
    .maybeSingle();

  if (!profile?.is_admin) redirect("/");

  return <AdminShell>{children}</AdminShell>;
}

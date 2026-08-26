import { AuthenticatedShell } from "@/components/auth/AuthenticatedShell";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { CallHistoryList } from "@/components/history/CallHistoryList";
import { CallHistoryEntry } from "@/lib/history/types";
import { createClient } from "@/lib/supabase/server";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();

  if (!authData?.claims) {
    return <AuthScreen />;
  }

  const { data, error } = await supabase
    .from("calls")
    .select(
      "id, created_at, scenario, identity, duration_seconds, overall_score, categories, metrics, biggest_mistake, best_moment, better_responses, transcript, objection_tags"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("history: failed to load calls", error);
  }

  return (
    <AuthenticatedShell>
      <CallHistoryList calls={(data ?? []) as unknown as CallHistoryEntry[]} />
    </AuthenticatedShell>
  );
}

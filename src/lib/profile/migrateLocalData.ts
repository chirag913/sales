import { SupabaseClient } from "@supabase/supabase-js";
import { loadSalesProfile } from "@/lib/storage/localProfile";
import { loadScenarios, loadTrainingProfile } from "@/lib/storage/localTrainingProfile";

const TABLE = "training_profiles";

/**
 * One-time migration from localStorage into Supabase. Runs once per user, the
 * first time they load the app after this table existed. Never overwrites an
 * existing Supabase row, and never deletes the localStorage copy — it just
 * stops being read once this has run.
 */
export async function migrateLocalDataIfNeeded(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data: existing } = await supabase.from(TABLE).select("user_id").eq("user_id", userId).maybeSingle();
  if (existing) return;

  const salesProfile = loadSalesProfile();
  const trainingProfile = loadTrainingProfile();
  const scenarios = loadScenarios();

  if (!salesProfile && !trainingProfile && !scenarios) return;

  await supabase.from(TABLE).insert({
    user_id: userId,
    sales_profile: salesProfile,
    training_profile: trainingProfile,
    scenarios,
  });
}

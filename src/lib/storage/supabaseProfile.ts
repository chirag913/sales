import { SupabaseClient } from "@supabase/supabase-js";
import { SalesProfile, Scenario, TrainingProfile } from "@/lib/types";

const TABLE = "training_profiles";

export interface RemoteProfileRow {
  salesProfile: SalesProfile | null;
  trainingProfile: TrainingProfile | null;
  scenarios: Scenario[] | null;
}

export async function loadRemoteProfileRow(supabase: SupabaseClient, userId: string): Promise<RemoteProfileRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("sales_profile, training_profile, scenarios")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    salesProfile: data.sales_profile as SalesProfile | null,
    trainingProfile: data.training_profile as TrainingProfile | null,
    scenarios: data.scenarios as Scenario[] | null,
  };
}

export async function saveRemoteSalesProfile(supabase: SupabaseClient, userId: string, profile: SalesProfile): Promise<void> {
  await supabase
    .from(TABLE)
    .upsert({ user_id: userId, sales_profile: profile, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
}

export async function saveRemoteTrainingProfile(
  supabase: SupabaseClient,
  userId: string,
  profile: TrainingProfile
): Promise<void> {
  await supabase
    .from(TABLE)
    .upsert({ user_id: userId, training_profile: profile, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
}

export async function saveRemoteScenarios(supabase: SupabaseClient, userId: string, scenarios: Scenario[]): Promise<void> {
  await supabase
    .from(TABLE)
    .upsert({ user_id: userId, scenarios, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
}

export async function clearRemoteTrainingProfile(supabase: SupabaseClient, userId: string): Promise<void> {
  await supabase
    .from(TABLE)
    .upsert(
      { user_id: userId, training_profile: null, scenarios: null, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
}

import { AuthenticatedShell } from "@/components/auth/AuthenticatedShell";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { TrainingSetup } from "@/components/onboarding/TrainingSetup";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    return <AuthScreen />;
  }

  return (
    <AuthenticatedShell>
      <TrainingSetup />
    </AuthenticatedShell>
  );
}

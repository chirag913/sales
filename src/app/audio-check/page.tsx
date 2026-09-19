import { AudioCheck } from "@/components/audio/AudioCheck";
import { AuthenticatedShell } from "@/components/auth/AuthenticatedShell";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { createClient } from "@/lib/supabase/server";

export default async function AudioCheckPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    return <AuthScreen />;
  }

  return (
    <AuthenticatedShell>
      <AudioCheck />
    </AuthenticatedShell>
  );
}

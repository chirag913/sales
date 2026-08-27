import Link from "next/link";
import { AuthenticatedShell } from "@/components/auth/AuthenticatedShell";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    return <AuthScreen />;
  }

  return (
    <AuthenticatedShell>
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <Link href="/practice" className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400">
          ← Back to training setup
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Improve My Training</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Optional. Add real company details, proof, and credibility so the AI prospect and coach can use them
          during calls. None of this is required to start training — it will never invent clients, results, or
          offices beyond what you enter here.
        </p>
        <div className="mt-8">
          <ProfileForm />
        </div>
      </div>
    </AuthenticatedShell>
  );
}

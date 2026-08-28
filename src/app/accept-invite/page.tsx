import { AcceptInviteScreen } from "@/components/team/AcceptInviteScreen";
import { AuthenticatedShell } from "@/components/auth/AuthenticatedShell";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { createClient } from "@/lib/supabase/server";

// Same auth.getClaims()/<AuthScreen/> fallback pattern as profile/page.tsx
// and history/page.tsx. AuthScreen's post-login step is router.refresh() on
// the same URL, so ?token= survives sign-in without extra plumbing.
export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    return <AuthScreen />;
  }

  if (!token) {
    return (
      <AuthenticatedShell>
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">This invite link is missing a token.</p>
        </div>
      </AuthenticatedShell>
    );
  }

  return (
    <AuthenticatedShell>
      <AcceptInviteScreen token={token} />
    </AuthenticatedShell>
  );
}

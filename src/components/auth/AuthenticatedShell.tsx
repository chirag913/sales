"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleSignOut}
        className="fixed right-4 top-4 z-50 text-xs text-zinc-400 underline-offset-4 hover:underline dark:text-zinc-500"
      >
        Sign out
      </button>
      {children}
    </div>
  );
}

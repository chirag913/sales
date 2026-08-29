"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { PRIMARY_LINK_CLASSES } from "@/components/ui/linkButtonClasses";
import { createClient } from "@/lib/supabase/client";

// Client-side session check (same lightweight getSession() call
// src/app/reset-password/page.tsx uses) rather than the server-side
// getClaims() pattern used elsewhere — this file sits at the app root, so a
// server-side cookies() read here would force every other route sharing
// this root segment out of static rendering. Defaults to the signed-out
// link until the client resolves, which is fine for a rarely-hit 404 page.
export default function NotFound() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session));
    });
  }, []);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-8 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        <Logo />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        This page doesn&apos;t exist.
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        The link might be broken, or the page may have moved.
      </p>
      <Link href={signedIn ? "/practice" : "/"} className={`${PRIMARY_LINK_CLASSES} mt-6 px-6 py-3 text-base`}>
        {signedIn ? "Back to practice" : "Back to home"}
      </Link>
    </div>
  );
}

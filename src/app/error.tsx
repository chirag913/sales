"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-8 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        <Logo />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Something went wrong.</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Give it another try, or email{" "}
        <a
          href="mailto:hello@bettercallz.com"
          className="underline underline-offset-4 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          hello@bettercallz.com
        </a>{" "}
        if it keeps happening.
      </p>
      <div className="mt-6">
        <Button onClick={() => retry()}>Try again</Button>
      </div>
    </div>
  );
}

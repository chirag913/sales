"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/inputClasses";
import { Logo } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";

type Status = "checking" | "ready" | "invalid";

function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm flex-col items-center justify-center px-6 py-16">
      <span className="mb-8 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        <Logo />
      </span>
      <div className="shadow-premium w-full rounded-3xl border border-zinc-200/70 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
        {children}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        settled = true;
        setStatus("ready");
      }
    });

    // The recovery link's session may already be established by the time this
    // effect runs (createBrowserClient parses the URL hash on load), in which
    // case the PASSWORD_RECOVERY event above won't fire again for us — fall
    // back to checking for an active session directly.
    supabase.auth.getSession().then(({ data }) => {
      if (!settled && data.session) {
        settled = true;
        setStatus("ready");
      } else if (!settled) {
        // Give onAuthStateChange a moment before concluding there's no
        // valid recovery session.
        setTimeout(() => {
          if (!settled) setStatus("invalid");
        }, 1500);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthCard>
        <div className="flex flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Password updated
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">You&apos;re all set — continue to BetterCallz.</p>
          <Button className="mt-6" onClick={() => router.push("/practice")}>
            Continue
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (status === "invalid") {
    return (
      <AuthCard>
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            This reset link is invalid or expired
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Request a new one from the sign-in page.</p>
          <Button variant="secondary" className="mt-6" onClick={() => router.push("/practice")}>
            Back to sign in
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (status === "checking") return null;

  return (
    <AuthCard>
      <div className="flex flex-col items-center text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <KeyRound className="h-5 w-5" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Set a new password
        </h1>
      </div>
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">New password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className={INPUT_CLASSES}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Confirm new password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className={INPUT_CLASSES}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" disabled={loading} className="mt-2 w-full justify-center">
          {loading ? "Please wait…" : "Update password"}
        </Button>
      </form>
    </AuthCard>
  );
}

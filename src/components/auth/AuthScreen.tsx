"use client";

import { FormEvent, ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/inputClasses";
import { Logo } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up" | "forgot-password";

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

export function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  function resetToSignIn() {
    setError(null);
    setCheckEmail(false);
    setResetEmailSent(false);
    setMode("sign-in");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === "forgot-password") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
        setResetEmailSent(true);
        return;
      }
      if (mode === "sign-up") {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (!data.session) {
          // Email confirmation is required before a session exists.
          setCheckEmail(true);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <AuthCard>
        <div className="flex flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <MailCheck className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Check your email
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            We sent a confirmation link to {email}. Confirm your account, then sign in below.
          </p>
          <Button variant="secondary" className="mt-6" onClick={resetToSignIn}>
            Back to sign in
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (resetEmailSent) {
    return (
      <AuthCard>
        <div className="flex flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <MailCheck className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Check your email
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            If an account exists for {email}, we sent a link to reset your password.
          </p>
          <Button variant="secondary" className="mt-6" onClick={resetToSignIn}>
            Back to sign in
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <h1 className="text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create an account" : "Reset your password"}
      </h1>
      <p className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {mode === "sign-in"
          ? "Sign in to start practicing."
          : mode === "sign-up"
            ? "Create an account to start practicing."
            : "We'll email you a link to reset your password."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            className={INPUT_CLASSES}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </label>

        {mode !== "forgot-password" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              className={INPUT_CLASSES}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </label>
        )}

        {mode === "sign-in" && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode("forgot-password");
            }}
            className="self-end text-xs text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
          >
            Forgot password?
          </button>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" disabled={loading} className="mt-2 w-full justify-center">
          {loading
            ? "Please wait…"
            : mode === "sign-in"
              ? "Sign in"
              : mode === "sign-up"
                ? "Sign up"
                : "Send reset link"}
        </Button>
      </form>

      {mode === "forgot-password" ? (
        <button
          type="button"
          onClick={resetToSignIn}
          className="mt-6 w-full text-center text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
        >
          Back to sign in
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode((m) => (m === "sign-in" ? "sign-up" : "sign-in"));
          }}
          className="mt-6 w-full text-center text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
        >
          {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      )}
    </AuthCard>
  );
}

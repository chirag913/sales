"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";

const inputClasses =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100 disabled:cursor-not-allowed disabled:opacity-50";

export function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
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
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Check your email</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          We sent a confirmation link to {email}. Confirm your account, then sign in below.
        </p>
        <Button
          variant="secondary"
          className="mt-6"
          onClick={() => {
            setCheckEmail(false);
            setMode("sign-in");
          }}
        >
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {mode === "sign-in" ? "Sign in" : "Create an account"}
      </h1>
      <p className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {mode === "sign-in" ? "Sign in to start practicing." : "Create an account to start practicing."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            className={inputClasses}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            className={inputClasses}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" disabled={loading} className="mt-2 w-full justify-center">
          {loading ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Sign up"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => {
          setError(null);
          setMode((m) => (m === "sign-in" ? "sign-up" : "sign-in"));
        }}
        className="mt-6 text-center text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
      >
        {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}

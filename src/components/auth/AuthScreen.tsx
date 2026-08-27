"use client";

import { FormEvent, ReactNode, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { INPUT_CLASSES } from "@/components/ui/inputClasses";
import { Logo } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES } from "@/lib/constants/countries";
import { TurnstileHandle, TurnstileWidget } from "@/components/auth/Turnstile";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type Mode = "sign-in" | "sign-up" | "forgot-password";

// Digits only, optional leading "+", 7-15 digits — long enough to reject
// obviously-invalid input (letters, a 3-digit number) without imposing a
// specific national format.
const MOBILE_NUMBER_PATTERN = /^\+?[0-9]{7,15}$/;

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
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const turnstileRef = useRef<TurnstileHandle>(null);

  function resetToSignIn() {
    setError(null);
    setCheckEmail(false);
    setResetEmailSent(false);
    setMode("sign-in");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "sign-up") {
      if (!fullName.trim() || !mobileNumber.trim() || !country || !city.trim()) {
        setError("Please fill in your name, mobile number, country, and city.");
        return;
      }
      if (!MOBILE_NUMBER_PATTERN.test(mobileNumber.trim())) {
        setError("Enter a valid mobile number (digits only).");
        return;
      }
    }
    // Supabase's CAPTCHA protection setting is global to the project — it
    // isn't sign-up-only, it also gates signInWithPassword and
    // resetPasswordForEmail. Missing this on any of the three broke sign-in
    // for every existing user, not just new sign-ups.
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError("Please complete the verification.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const token = captchaToken ?? undefined;

      if (mode === "forgot-password") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
          captchaToken: token,
        });
        turnstileRef.current?.reset();
        setCaptchaToken(null);
        if (resetError) throw resetError;
        setResetEmailSent(true);
        return;
      }
      if (mode === "sign-up") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            captchaToken: token,
            data: {
              full_name: fullName.trim(),
              mobile_number: mobileNumber.trim(),
              country,
              city: city.trim(),
            },
          },
        });
        turnstileRef.current?.reset();
        setCaptchaToken(null);
        if (signUpError) throw signUpError;
        if (!data.session) {
          // Email confirmation is required before a session exists.
          setCheckEmail(true);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
          options: { captchaToken: token },
        });
        turnstileRef.current?.reset();
        setCaptchaToken(null);
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

        {mode === "sign-up" && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Full name</span>
              <input
                type="text"
                required
                autoComplete="name"
                className={INPUT_CLASSES}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Mobile number</span>
              <input
                type="tel"
                required
                autoComplete="tel"
                placeholder="e.g. +919876543210"
                className={INPUT_CLASSES}
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                disabled={loading}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Country</span>
              <select
                required
                autoComplete="country-name"
                className={INPUT_CLASSES}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={loading}
              >
                <option value="" disabled>
                  Select a country
                </option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">City</span>
              <input
                type="text"
                required
                autoComplete="address-level2"
                className={INPUT_CLASSES}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading}
              />
            </label>
          </>
        )}

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

        {TURNSTILE_SITE_KEY && (
          <TurnstileWidget
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            onVerify={setCaptchaToken}
            onExpire={() => setCaptchaToken(null)}
          />
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

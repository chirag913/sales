"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SECONDARY_LINK_CLASSES } from "@/components/ui/linkButtonClasses";
import { InvitePreview } from "@/lib/team/types";

type Phase = "loading" | "invalid" | "consent" | "joined" | "error";

export function AcceptInviteScreen({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [joinedTeamName, setJoinedTeamName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/teams/accept-invite?token=${encodeURIComponent(token)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: InvitePreview | null) => {
        if (cancelled) return;
        if (!data || !data.valid) {
          setPhase("invalid");
          return;
        }
        setPreview(data);
        setPhase("consent");
      })
      .catch(() => !cancelled && setPhase("invalid"));
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleAccept() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/teams/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, consent: true }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const messages: Record<string, string> = {
          email_mismatch: `This invite was sent to ${preview?.email ?? "a different email"}. Sign in with that email to accept.`,
          already_on_a_team: "You're already on a team — leave it first before joining another.",
          invite_invalid_or_expired: "This invite link is invalid or has expired.",
        };
        throw new Error(messages[body?.error] ?? "Failed to accept the invite.");
      }
      setJoinedTeamName(body.teamName as string);
      setPhase("joined");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("error");
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "loading") {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      </div>
    );
  }

  if (phase === "invalid") {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Invite not found</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          This invite link is invalid or has expired. Ask your team owner to send a new one.
        </p>
        <Link href="/practice" className="mt-6 text-sm text-emerald-600 underline-offset-4 hover:underline dark:text-emerald-400">
          Back to practice
        </Link>
      </div>
    );
  }

  if (phase === "joined") {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">You&apos;ve joined {joinedTeamName}</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Your practice calls will now draw from this team&apos;s shared credit pool.
        </p>
        <Link href="/practice" className="mt-6 text-sm text-emerald-600 underline-offset-4 hover:underline dark:text-emerald-400">
          Start practicing
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        You&apos;ve been invited to join <span className="text-emerald-600 dark:text-emerald-400">{preview?.teamName}</span>
      </h1>

      <div className="shadow-premium mt-8 w-full rounded-3xl border border-amber-200 bg-amber-50 p-6 text-left dark:border-amber-900/50 dark:bg-amber-950/30">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">This is different from your individual account</p>
            <p className="mt-1.5 text-sm text-amber-800/90 dark:text-amber-300/90">
              Your team admin will be able to see your call scores, history, and transcripts. This is different from
              an individual account, where your practice calls stay fully private.
            </p>
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/practice" className={SECONDARY_LINK_CLASSES}>
          Not now
        </Link>
        <Button onClick={() => void handleAccept()} disabled={submitting}>
          {submitting ? "Joining…" : "I understand — join the team"}
        </Button>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Headphones, Mic, ShieldCheck, Volume1 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProspectAvatar } from "@/components/ui/ProspectAvatar";
import { ProspectIdentity, Scenario, TrainingProfile } from "@/lib/types";

interface ReadyToCallProps {
  profile: TrainingProfile;
  scenario: Scenario;
  identity: ProspectIdentity;
  onBack: () => void;
  onStartCall: () => void;
}

const MARKET_LABEL: Record<string, string> = {
  US: "🇺🇸 United States",
  UK: "🇬🇧 United Kingdom",
  Canada: "🇨🇦 Canada",
  Australia: "🇦🇺 Australia",
  Other: "🌍 Other",
};

export function ReadyToCall({ profile, scenario, identity, onBack, onStartCall }: ReadyToCallProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 self-start text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
      >
        ← Choose a different scenario
      </button>

      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Ready?</h1>

      <div className="shadow-premium mt-8 w-full rounded-3xl border border-zinc-200/70 bg-white p-6 text-left dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-4">
          <ProspectAvatar identity={identity} size="lg" active />
          <div>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{identity.fullName}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {identity.title} · {identity.company}
            </p>
          </div>
        </div>

        <dl className="mt-6 space-y-4 border-t border-zinc-100 pt-6 dark:border-zinc-900">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Target</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">
              {MARKET_LABEL[profile.market] ?? profile.market} · {profile.service}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Scenario</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">
              {scenario.icon} {scenario.name} · {scenario.difficulty}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Objective</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">{scenario.objective}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 w-full rounded-2xl border border-zinc-200/70 bg-zinc-50 p-5 text-left dark:border-zinc-800 dark:bg-zinc-900/50">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Before you start</p>
        <ul className="mt-3 space-y-2.5 text-sm text-zinc-600 dark:text-zinc-400">
          <li className="flex items-start gap-2.5">
            <Headphones className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden />
            Use headphones so the AI can hear you clearly
          </li>
          <li className="flex items-start gap-2.5">
            <Volume1 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden />
            Find a quiet environment — background noise can throw off the call
          </li>
          <li className="flex items-start gap-2.5">
            <Mic className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden />
            Turn on your OS&apos;s voice isolation / noise suppression if it has one
          </li>
          <li className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden />
            <span>
              <Link
                href="/privacy"
                className="underline underline-offset-4 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Private practice
              </Link>{" "}
              — your practice calls are private and aren&apos;t shared with other users. Your calls are used to
              generate your transcript, coaching, and score.
            </span>
          </li>
        </ul>
      </div>

      <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
        Your microphone will be requested when the call starts.
      </p>

      <div className="mt-8">
        <Button onClick={onStartCall} className="gap-2 px-6 py-3 text-base">
          <Mic className="h-4 w-4" aria-hidden />
          Start Call
        </Button>
      </div>
    </div>
  );
}

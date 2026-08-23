"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Scenario, TrainingProfile } from "@/lib/types";

interface ReadyToCallProps {
  profile: TrainingProfile;
  scenario: Scenario;
  onBack: () => void;
}

const MARKET_LABEL: Record<string, string> = {
  US: "🇺🇸 United States",
  UK: "🇬🇧 United Kingdom",
  Canada: "🇨🇦 Canada",
  Australia: "🇦🇺 Australia",
  Other: "🌍 Other",
};

export function ReadyToCall({ profile, scenario, onBack }: ReadyToCallProps) {
  const [showComingSoon, setShowComingSoon] = useState(false);

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

      <dl className="mt-8 w-full space-y-4 rounded-2xl border border-zinc-200/70 bg-white p-6 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Target</dt>
          <dd className="text-zinc-900 dark:text-zinc-50">
            {MARKET_LABEL[profile.market] ?? profile.market} · {profile.service}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Prospect</dt>
          <dd className="text-zinc-900 dark:text-zinc-50">
            {scenario.icon} {scenario.name}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Difficulty</dt>
          <dd className="text-zinc-900 dark:text-zinc-50">{scenario.difficulty}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Objective</dt>
          <dd className="text-zinc-900 dark:text-zinc-50">{scenario.objective}</dd>
        </div>
      </dl>

      <div className="mt-8">
        <Button onClick={() => setShowComingSoon(true)} className="px-6 py-3 text-base">
          🎙️ Start Call
        </Button>
      </div>

      {showComingSoon && (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Voice calling is coming in the next phase — this is where the realtime call will start.
        </p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CallScoreResult, Scenario, TranscriptEntry } from "@/lib/types";

interface ScoreScreenProps {
  scenario: Scenario;
  durationSeconds: number;
  result: CallScoreResult | null;
  loading: boolean;
  error: string | null;
  transcript: TranscriptEntry[] | null;
  onPracticeAgain: () => void;
  onDone: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-400 dark:text-zinc-500">{label}</p>
      <p className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}

export function ScoreScreen({
  scenario,
  durationSeconds,
  result,
  loading,
  error,
  transcript,
  onPracticeAgain,
  onDone,
}: ScoreScreenProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  if (loading || !result) {
    return (
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center px-6 text-center">
        {error ? (
          <>
            <p className="text-lg font-medium text-red-600 dark:text-red-400">Couldn&apos;t score this call</p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
            <div className="mt-6">
              <Button variant="secondary" onClick={onDone}>
                Back to scenarios
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Scoring your call…</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      <div className="mb-8 text-center">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {scenario.icon} {scenario.name} · {formatDuration(durationSeconds)}
        </p>
        <p className="mt-2 text-6xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{result.overallScore}</p>
        <p className="text-sm text-zinc-400 dark:text-zinc-500">out of 100</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {result.categories.map((cat) => (
          <div
            key={cat.name}
            className="rounded-2xl border border-zinc-200/70 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{cat.name}</p>
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{cat.score}/10</p>
            </div>
            <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">{cat.reason}</p>
            <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">Better: {cat.betterApproach}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-zinc-200/70 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-4">
        <Metric label="Duration" value={formatDuration(durationSeconds)} />
        <Metric label="Questions asked" value={String(result.metrics.questionCount)} />
        <Metric label="Objections" value={`${result.metrics.objectionsHandled}/${result.metrics.objectionCount} handled`} />
        <Metric label="Missed signals" value={String(result.metrics.missedBuyingSignals)} />
        <Metric label="You talked" value={`${result.metrics.userSpeakingPercent}%`} />
        <Metric label="Prospect talked" value={`${result.metrics.prospectSpeakingPercent}%`} />
        <Metric label="Longest monologue" value={`${result.metrics.longestUserMonologueWords} words`} />
        <Metric label="Next-step asks" value={String(result.metrics.nextStepAskCount)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">Your #1 mistake</p>
          <p className="mt-1.5 text-sm text-red-700/90 dark:text-red-300/90">{result.biggestMistake}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Your best moment</p>
          <p className="mt-1.5 text-sm text-emerald-700/90 dark:text-emerald-300/90">{result.bestMoment}</p>
        </div>
      </div>

      {result.betterResponses.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Better responses</p>
          <div className="flex flex-col gap-4">
            {result.betterResponses.map((moment, i) => (
              <div
                key={i}
                className="rounded-2xl border border-zinc-200/70 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  What happened
                </p>
                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{moment.whatHappened}</p>
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  What you said
                </p>
                <p className="mt-1 text-sm italic text-zinc-600 dark:text-zinc-400">&ldquo;{moment.whatYouSaid}&rdquo;</p>
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Better response
                </p>
                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">&ldquo;{moment.betterResponse}&rdquo;</p>
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Why it&apos;s better
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{moment.whyItsBetter}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {transcript && transcript.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setTranscriptOpen((open) => !open)}
            className="flex w-full items-center justify-between rounded-2xl border border-zinc-200/70 bg-white px-5 py-3 text-left dark:border-zinc-800 dark:bg-zinc-950"
          >
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">View full transcript</span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">{transcriptOpen ? "Hide ▲" : "Show ▼"}</span>
          </button>

          {transcriptOpen && (
            <div className="mt-3 flex flex-col space-y-4 rounded-2xl border border-zinc-200/70 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              {transcript.map((entry) => (
                <div key={entry.id} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      entry.role === "user"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    }`}
                  >
                    <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide opacity-60">
                      {entry.role === "user" ? "You" : "Prospect"}
                    </p>
                    {entry.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-10 flex justify-center gap-3">
        <Button variant="secondary" onClick={onDone}>
          Back to scenarios
        </Button>
        <Button onClick={onPracticeAgain}>Practice Again</Button>
      </div>
    </div>
  );
}

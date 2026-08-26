"use client";

import { Button } from "@/components/ui/Button";
import { CallResultDetail } from "@/components/call/CallResultDetail";
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
      <CallResultDetail scenario={scenario} durationSeconds={durationSeconds} result={result} transcript={transcript} />

      <div className="mt-10 flex justify-center gap-3">
        <Button variant="secondary" onClick={onDone}>
          Back to scenarios
        </Button>
        <Button onClick={onPracticeAgain}>Practice Again</Button>
      </div>
    </div>
  );
}

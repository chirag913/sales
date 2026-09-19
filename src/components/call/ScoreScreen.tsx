"use client";

import { Button } from "@/components/ui/Button";
import { CallResultDetail } from "@/components/call/CallResultDetail";
import { CallScoreResult, ProspectIdentity, Scenario, TranscriptEntry } from "@/lib/types";

interface ScoreScreenProps {
  scenario: Scenario;
  identity: ProspectIdentity;
  durationSeconds: number;
  result: CallScoreResult | null;
  loading: boolean;
  error: string | null;
  transcript: TranscriptEntry[] | null;
  previousBestScore?: number;
  previousScore?: number;
  callNumber?: number;
  saveState: "idle" | "saving" | "saved" | "error";
  saveError: string | null;
  onRetryScoring: () => void;
  onRetrySave: () => void;
  onPracticeAgain: (mode: "same" | "fresh") => void;
  onDone: () => void;
}

export function ScoreScreen({
  scenario,
  identity,
  durationSeconds,
  result,
  loading,
  error,
  transcript,
  previousBestScore,
  previousScore,
  callNumber,
  saveState,
  saveError,
  onRetryScoring,
  onRetrySave,
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
            <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
              Your call is kept. Trying again doesn&apos;t use another call.
            </p>
            <div className="mt-6 flex gap-3">
              <Button onClick={onRetryScoring}>Try scoring again</Button>
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
      <CallResultDetail
        scenario={scenario}
        identity={identity}
        durationSeconds={durationSeconds}
        result={result}
        transcript={transcript}
        previousBestScore={previousBestScore}
        previousScore={previousScore}
        callNumber={callNumber}
      />

      {saveState === "saving" && (
        <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">Saving this call to your history…</p>
      )}
      {saveState === "error" && (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">This call wasn&apos;t saved to your history.</p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{saveError}</p>
          <div className="mt-3 flex justify-center">
            <Button variant="secondary" onClick={onRetrySave}>
              Retry saving
            </Button>
          </div>
        </div>
      )}

      <div className="mt-10 flex flex-col items-center gap-3">
        <p className="text-xs text-zinc-400 dark:text-zinc-500">Retry this same scenario</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => onPracticeAgain("same")}>Same prospect</Button>
          <Button variant="secondary" onClick={() => onPracticeAgain("fresh")}>
            Fresh prospect
          </Button>
        </div>
        <button
          type="button"
          onClick={onDone}
          className="mt-2 text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
        >
          Choose a different scenario
        </button>
      </div>
    </div>
  );
}

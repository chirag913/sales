"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { ProspectAvatar } from "@/components/ui/ProspectAvatar";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { CallScoreCategory, CallScoreResult, ObjectiveOutcomeStatus, ProspectIdentity, Scenario, TranscriptEntry } from "@/lib/types";

interface CallResultDetailProps {
  scenario: Pick<Scenario, "name">;
  durationSeconds: number;
  result: CallScoreResult;
  transcript: TranscriptEntry[] | null;
  objectionTags?: string[];
  identity?: ProspectIdentity;
  previousBestScore?: number;
  previousScore?: number;
  callNumber?: number;
}

export function formatCallDuration(seconds: number): string {
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

function categoryBarColor(score: number): string {
  if (score >= 8) return "bg-emerald-500";
  if (score >= 6) return "bg-amber-500";
  return "bg-red-500";
}

const MAX_BETTER_RESPONSES = 3;

const OUTCOME_STYLE: Record<ObjectiveOutcomeStatus, { label: string; className: string }> = {
  achieved: { label: "Achieved", className: "text-emerald-600 dark:text-emerald-400" },
  partially_achieved: { label: "Partly achieved", className: "text-amber-600 dark:text-amber-400" },
  not_achieved: { label: "Not achieved", className: "text-red-600 dark:text-red-400" },
  not_reachable: { label: "Not realistically reachable on this call", className: "text-zinc-600 dark:text-zinc-300" },
};

function FeedbackLine({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">{children}</p>
    </div>
  );
}

// One category: score bar, plus what happened / why it mattered / what to
// change / a better example. Calls scored before the richer feedback existed
// only have `reason` and `betterApproach`; the two new fields simply don't render.
function CategoryCard({ category, defaultOpen }: { category: CallScoreCategory; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{category.name}</p>
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{category.score}/10</p>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
            <div className={`h-full rounded-full ${categoryBarColor(category.score)}`} style={{ width: `${category.score * 10}%` }} />
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
        )}
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-zinc-100 px-4 pb-4 pt-3 dark:border-zinc-900">
          {category.reason && <FeedbackLine label="What happened">{category.reason}</FeedbackLine>}
          {category.whyItMattered && <FeedbackLine label="Why it mattered">{category.whyItMattered}</FeedbackLine>}
          {category.betterApproach && <FeedbackLine label="What to change">{category.betterApproach}</FeedbackLine>}
          {category.betterExample && <FeedbackLine label="Better example">{`“${category.betterExample.replace(/^["“]|["”]$/g, "")}”`}</FeedbackLine>}
        </div>
      )}
    </div>
  );
}

// The shared score/debrief rendering used both right after a call
// (ScoreScreen) and when reviewing a past call (call history) — same data
// shape (calls.categories/metrics/... map directly onto CallScoreResult),
// so this is the one place that renders it. previousBestScore/previousScore/
// callNumber are optional — only the fresh post-call ScoreScreen passes
// them, since "vs last call" only makes sense right after a call, not when
// reviewing history.
export function CallResultDetail({
  scenario,
  durationSeconds,
  result,
  transcript,
  objectionTags,
  identity,
  previousBestScore,
  previousScore,
  callNumber,
}: CallResultDetailProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const isNewBest = previousBestScore !== undefined && result.overallScore > previousBestScore;
  const delta = previousScore !== undefined ? result.overallScore - previousScore : null;

  // Repetition is handled where the feedback is generated (see the "give each
  // moment one home" rule in src/lib/ai/score.ts), not patched up here.
  const betterResponses = result.betterResponses.slice(0, MAX_BETTER_RESPONSES);

  const hasObjectionsSection = (objectionTags && objectionTags.length > 0) || result.metrics.objectionCount > 0;

  // The two weakest categories start open; the rest are one click away.
  const weakestNames = new Set(
    [...result.categories]
      .sort((a, b) => a.score - b.score)
      .slice(0, 2)
      .map((c) => c.name)
  );

  return (
    <div>
      <div className="mb-8 flex flex-col items-center text-center">
        {identity && (
          <div className="mb-4 flex items-center gap-3">
            <ProspectAvatar identity={identity} size="sm" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {identity.fullName} · {identity.title}
            </p>
          </div>
        )}
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {scenario.name} · {formatCallDuration(durationSeconds)}
        </p>
        <div className="mt-4">
          <ScoreGauge value={result.overallScore} />
        </div>

        {(isNewBest || delta !== null || callNumber !== undefined) && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {isNewBest && (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                <Trophy className="h-3 w-3 text-emerald-500" aria-hidden />
                New personal best
              </span>
            )}
            {!isNewBest && delta !== null && delta !== 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                {delta > 0 ? (
                  <ChevronUp className="h-3 w-3 text-emerald-500" aria-hidden />
                ) : (
                  <ChevronDown className="h-3 w-3" aria-hidden />
                )}
                {delta > 0 ? "+" : ""}
                {delta} vs last call
              </span>
            )}
            {callNumber !== undefined && (
              <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                Call #{callNumber}
              </span>
            )}
          </div>
        )}
      </div>

      {result.objectiveOutcome && (
        <div className="mb-4 rounded-2xl border border-zinc-200/70 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Call objective</p>
          <p className="mt-1 text-sm">
            <span className={`font-semibold ${OUTCOME_STYLE[result.objectiveOutcome.status].className}`}>
              {OUTCOME_STYLE[result.objectiveOutcome.status].label}
            </span>
            <span className="text-zinc-600 dark:text-zinc-400"> — {result.objectiveOutcome.reason}</span>
          </p>
        </div>
      )}

      {result.workOnNext && result.workOnNext.length > 0 && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Work on this next</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-800 dark:text-emerald-200">
            {result.workOnNext.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {result.categories.map((cat) => (
          <CategoryCard key={cat.name} category={cat} defaultOpen={weakestNames.has(cat.name)} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 rounded-2xl border border-zinc-200/70 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-950">
        <Metric label="Questions asked" value={String(result.metrics.questionCount)} />
        <Metric label="Objections" value={`${result.metrics.objectionsHandled}/${result.metrics.objectionCount} handled`} />
        <Metric label="Next-step asks" value={String(result.metrics.nextStepAskCount)} />
      </div>

      <button
        type="button"
        onClick={() => setDetailsOpen((open) => !open)}
        className="mt-6 flex w-full items-center justify-between rounded-2xl border border-zinc-200/70 bg-white px-5 py-3 text-left dark:border-zinc-800 dark:bg-zinc-950"
      >
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Show details</span>
        <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
          {detailsOpen ? "Hide" : "Show"}
          {detailsOpen ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
        </span>
      </button>

      {detailsOpen && (
        <div className="mt-4 flex flex-col gap-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-950/30">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">What to work on</p>
            <p className="mt-1.5 text-sm text-red-700/90 dark:text-red-300/90">{result.biggestMistake}</p>
          </div>

          {hasObjectionsSection && (
            <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Objections</p>

              {objectionTags && objectionTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {objectionTags.map((tag) => (
                    <Chip key={tag}>{tag}</Chip>
                  ))}
                </div>
              )}

              <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
                {result.metrics.objectionsHandled}/{result.metrics.objectionCount} handled
              </p>
            </div>
          )}

          {betterResponses.length > 0 && (
            <div>
              <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Better responses</p>
              <div className="flex flex-col gap-4">
                {betterResponses.map((moment, i) => (
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

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">What you did well</p>
            <p className="mt-1.5 text-sm text-emerald-700/90 dark:text-emerald-300/90">{result.bestMoment}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-zinc-200/70 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-4">
            <Metric label="You talked" value={`${result.metrics.userSpeakingPercent}%`} />
            <Metric label="Prospect talked" value={`${result.metrics.prospectSpeakingPercent}%`} />
            <Metric label="Longest monologue" value={`${result.metrics.longestUserMonologueWords} words`} />
            <Metric label="Missed signals" value={String(result.metrics.missedBuyingSignals)} />
          </div>

          {transcript && transcript.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setTranscriptOpen((open) => !open)}
                className="flex w-full items-center justify-between rounded-2xl border border-zinc-200/70 bg-white px-5 py-3 text-left dark:border-zinc-800 dark:bg-zinc-950"
              >
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">View full transcript</span>
                <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                  {transcriptOpen ? "Hide" : "Show"}
                  {transcriptOpen ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
                </span>
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
        </div>
      )}
    </div>
  );
}

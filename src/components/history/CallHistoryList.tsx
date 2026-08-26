"use client";

import { useState } from "react";
import Link from "next/link";
import { CallResultDetail } from "@/components/call/CallResultDetail";
import { Chip } from "@/components/ui/Chip";
import { PRIMARY_LINK_CLASSES } from "@/components/ui/linkButtonClasses";
import { CallHistoryEntry } from "@/lib/history/types";
import { CallScoreResult } from "@/lib/types";

function formatCallDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function toResult(call: CallHistoryEntry): CallScoreResult {
  return {
    overallScore: call.overall_score,
    categories: call.categories,
    metrics: call.metrics,
    biggestMistake: call.biggest_mistake,
    bestMoment: call.best_moment,
    betterResponses: call.better_responses,
  };
}

export function CallHistoryList({ calls }: { calls: CallHistoryEntry[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (calls.length === 0) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">No calls yet</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Complete a practice call and it&apos;ll show up here.
        </p>
        <Link href="/practice" className={`${PRIMARY_LINK_CLASSES} mt-6 px-6 py-3 text-base`}>
          Start practicing
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Call history</h1>
      <p className="mt-2 text-zinc-500 dark:text-zinc-400">
        {calls.length} practice call{calls.length === 1 ? "" : "s"}
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {calls.map((call) => {
          const isOpen = expandedId === call.id;
          return (
            <div
              key={call.id}
              className="rounded-2xl border border-zinc-200/70 bg-white dark:border-zinc-800 dark:bg-zinc-950"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : call.id)}
                className="flex w-full flex-col gap-2 p-5 text-left sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {call.scenario.icon} {call.scenario.name}{" "}
                    <span className="font-normal text-zinc-500 dark:text-zinc-400">
                      vs {call.identity.fullName}, {call.identity.title}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    {formatCallDate(call.created_at)} · {formatDuration(call.duration_seconds)}
                  </p>
                  {call.objection_tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {call.objection_tags.map((tag) => (
                        <Chip key={tag}>{tag}</Chip>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
                  <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{call.overall_score}</span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">{isOpen ? "Hide ▲" : "Details ▼"}</span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-zinc-200/70 p-5 dark:border-zinc-800">
                  <CallResultDetail
                    scenario={call.scenario}
                    durationSeconds={call.duration_seconds}
                    result={toResult(call)}
                    transcript={call.transcript}
                    objectionTags={call.objection_tags}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

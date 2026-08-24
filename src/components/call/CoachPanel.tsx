"use client";

import { CoachMode, CoachTip } from "@/lib/types";

interface CoachPanelProps {
  mode: CoachMode;
  onModeChange: (mode: CoachMode) => void;
  tip: CoachTip | null;
  loading: boolean;
}

const TYPE_STYLE: Record<CoachTip["type"], { emoji: string; className: string }> = {
  objection: {
    emoji: "🟡",
    className: "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30",
  },
  buying_signal: {
    emoji: "🟢",
    className: "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30",
  },
  mistake: {
    emoji: "🔴",
    className: "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30",
  },
};

const MODE_OPTIONS: { value: CoachMode; label: string; subtitle: string }[] = [
  { value: "training", label: "Training", subtitle: "Easy — full guidance" },
  { value: "practice", label: "Practice", subtitle: "Medium — light hints" },
  { value: "exam", label: "Exam", subtitle: "Hard — no help" },
];

export function CoachPanel({ mode, onModeChange, tip, loading }: CoachPanelProps) {
  return (
    <div className="flex w-full flex-col gap-3 sm:w-64 sm:shrink-0">
      <div className="flex items-stretch gap-1 rounded-2xl border border-zinc-200 p-1 dark:border-zinc-800">
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onModeChange(opt.value)}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-center transition-colors ${
              mode === opt.value
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <span className="text-xs font-medium">{opt.label}</span>
            <span className={`text-[10px] leading-tight ${mode === opt.value ? "opacity-80" : "opacity-70"}`}>
              {opt.subtitle}
            </span>
          </button>
        ))}
      </div>

      <div className="min-h-[120px] rounded-2xl border border-zinc-200/70 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        {mode === "exam" ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Exam mode — no live coaching. You&apos;re on your own.</p>
        ) : tip ? (
          <div className={`rounded-xl border p-3 ${TYPE_STYLE[tip.type].className}`}>
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              {TYPE_STYLE[tip.type].emoji} {tip.label}
            </p>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{tip.note}</p>
            {mode === "training" && tip.suggestedResponse && (
              <p className="mt-2 text-sm italic text-zinc-600 dark:text-zinc-400">
                Suggested: &ldquo;{tip.suggestedResponse}&rdquo;
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">{loading ? "Listening…" : "Coach is watching quietly."}</p>
        )}
      </div>
    </div>
  );
}

import { ReactNode } from "react";

interface ChipProps {
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  // Read-only chips only (ignored when onClick is set — selection state
  // already carries its own meaning there).
  // - "positive": a signal worth calling out favorably, e.g. a readiness
  //   badge — same emerald tone used for positive/success signals
  //   elsewhere (CallResultDetail's "new personal best" badge, its "what
  //   you did well" card, AuthenticatedShell). Don't reuse "positive" for
  //   something that isn't actually a success signal — e.g. a "warm call"
  //   badge would read as "this call already succeeded," which it hasn't.
  // - "cold" / "lukewarm" / "warm": a literal temperature scale (sky ->
  //   amber -> orange), deliberately not emerald, for exactly that reason —
  //   see ProfileReview.tsx's Call Type badge.
  tone?: "neutral" | "positive" | "cold" | "lukewarm" | "warm";
}

export function Chip({ children, onClick, selected, tone = "neutral" }: ChipProps) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={`inline-flex items-center rounded-full px-3 py-1 text-sm transition-colors ${
          selected
            ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        }`}
      >
        {children}
      </button>
    );
  }

  const TONE_CLASSES: Record<NonNullable<ChipProps["tone"]>, string> = {
    neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    positive: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    cold: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    lukewarm: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    warm: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  };
  const toneClasses = TONE_CLASSES[tone];

  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${toneClasses}`}>{children}</span>;
}

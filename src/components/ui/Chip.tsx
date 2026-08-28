import { ReactNode } from "react";

interface ChipProps {
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  // Read-only chips only (ignored when onClick is set — selection state
  // already carries its own meaning there). "positive" is for a signal
  // worth calling out favorably, e.g. a readiness badge — same emerald
  // tone used for positive signals elsewhere (CallResultDetail's "new
  // personal best" badge, AuthenticatedShell).
  tone?: "neutral" | "positive";
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

  const toneClasses =
    tone === "positive"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${toneClasses}`}>{children}</span>;
}

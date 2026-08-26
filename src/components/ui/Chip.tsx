import { ReactNode } from "react";

interface ChipProps {
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
}

export function Chip({ children, onClick, selected }: ChipProps) {
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

  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {children}
    </span>
  );
}

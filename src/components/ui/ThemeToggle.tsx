"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const THEME_STORAGE_KEY = "theme";
const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// The "dark" class on <html> — set before hydration by the root layout's
// inline script, and from then on the actual source of truth (not a piece
// of React state duplicating it) — is genuinely external state, so this
// reads it via useSyncExternalStore rather than useState+useEffect. That
// also sidesteps the SSR/hydration mismatch a plain effect would need to
// paper over: getServerSnapshot below matches the light default with no
// `document` access on the server.
function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot(): boolean {
  return false;
}

function setTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
  } catch {
    // Storage can be unavailable (private browsing, disabled) — the theme
    // still applies for this page view, it just won't persist.
  }
  listeners.forEach((listener) => listener());
}

interface ThemeToggleProps {
  // "icon": bare icon button for a header row. "menuitem": full-width row
  // matching AuthenticatedShell's UserMenu list items (Profile & settings,
  // Sign out).
  variant?: "icon" | "menuitem";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className = "" }: ThemeToggleProps) {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function handleClick() {
    setTheme(!isDark);
  }

  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  if (variant === "menuitem") {
    return (
      <button
        type="button"
        role="menuitem"
        onClick={handleClick}
        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900 ${className}`}
      >
        <Icon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" aria-hidden />
        {isDark ? "Light mode" : "Dark mode"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 ${className}`}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

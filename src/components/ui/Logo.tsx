interface LogoProps {
  className?: string;
}

// The wordmark used everywhere the brand appears as a mark (nav, auth
// cards, footer) — not for prose mentions of the brand name. The accent
// dot always renders in the site's green accent, regardless of the
// surrounding text color, so it reads consistently across light/dark and
// on both zinc-900 and zinc-50 text.
export function Logo({ className = "" }: LogoProps) {
  return (
    <span className={className}>
      bettercallz<span className="text-emerald-600 dark:text-emerald-500">.</span>
    </span>
  );
}

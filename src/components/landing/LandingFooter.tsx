export function LandingFooter() {
  return (
    <footer className="border-t border-zinc-200/70 py-10 dark:border-zinc-800">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-zinc-500 dark:text-zinc-400 sm:flex-row">
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">bettercallz</span>
        <span>© {new Date().getFullYear()} bettercallz. All rights reserved.</span>
      </div>
    </footer>
  );
}

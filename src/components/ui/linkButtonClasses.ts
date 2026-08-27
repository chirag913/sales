// Same visual classes as Button.tsx's variants, for places a CTA must be a
// <Link> (real navigation) rather than a <button> — avoids nesting a button
// inside an anchor.
export const PRIMARY_LINK_CLASSES =
  "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black bg-zinc-900 text-white shadow-sm hover:bg-zinc-700 hover:-translate-y-px active:translate-y-0 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";

export const SECONDARY_LINK_CLASSES =
  "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black border border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 hover:-translate-y-px active:translate-y-0 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-900";

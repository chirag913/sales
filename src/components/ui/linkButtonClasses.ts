// Same visual classes as Button.tsx's variants, for places a CTA must be a
// <Link> (real navigation) rather than a <button> — avoids nesting a button
// inside an anchor.
export const PRIMARY_LINK_CLASSES =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";

export const SECONDARY_LINK_CLASSES =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900";

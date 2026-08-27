// Single source of truth for text-input styling — reused by AuthScreen,
// the reset-password page, and FormField so every input in the app shares
// the same radius/shadow/focus treatment.
export const INPUT_CLASSES =
  "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 transition-colors focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50";

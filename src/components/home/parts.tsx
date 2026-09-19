import { ReactNode } from "react";

// Small shared pieces for the BetterCallz home (lead-response) page. The
// visual system is the app's existing one (Geist, zinc neutrals, thin
// borders, mono eyebrows) with teal as the single accent.

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-teal-700 dark:text-teal-400">{children}</p>
  );
}

interface SectionProps {
  id?: string;
  children: ReactNode;
  className?: string;
}

export function Section({ id, children, className = "" }: SectionProps) {
  return (
    <section id={id} className={`mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-20 sm:py-28 ${className}`}>
      {children}
    </section>
  );
}

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}

export function SectionHeading({ eyebrow, title, description, className = "" }: SectionHeadingProps) {
  return (
    <div className={`max-w-2xl ${className}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-zinc-900 dark:text-zinc-50 sm:text-4xl">
        {title}
      </h2>
      {description && <p className="mt-4 text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>}
    </div>
  );
}

// Marks a visual as an example of the intended workflow, not a live product
// screen or a customer result. Used on every mock-up on this page.
export function IllustrativeTag({ children = "Illustrative example" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
      {children}
    </span>
  );
}

// A vertical workflow: small nodes joined by a hairline. Reads top to bottom
// on every screen size, so it never needs a separate mobile layout.
export function WorkflowList({ steps, emphasizeLast = true }: { steps: string[]; emphasizeLast?: boolean }) {
  return (
    <ol className="relative flex flex-col gap-3.5">
      <span aria-hidden className="absolute bottom-2 left-[5px] top-2 w-px bg-zinc-200 dark:bg-zinc-800" />
      {steps.map((step, i) => {
        const last = emphasizeLast && i === steps.length - 1;
        return (
          <li key={step} className="relative flex items-center gap-4">
            <span
              aria-hidden
              className={`relative z-10 h-[11px] w-[11px] shrink-0 rounded-full border-2 ${
                last
                  ? "border-teal-600 bg-teal-600 dark:border-teal-400 dark:bg-teal-400"
                  : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950"
              }`}
            />
            <span
              className={`font-mono text-xs font-medium uppercase tracking-wide ${
                last ? "text-teal-700 dark:text-teal-400" : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-zinc-100 py-2.5 first:border-t-0 dark:border-zinc-900">
      <dt className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="text-right text-sm font-medium text-zinc-900 dark:text-zinc-50">{value}</dd>
    </div>
  );
}

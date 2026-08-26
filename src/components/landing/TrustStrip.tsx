import { Chip } from "@/components/ui/Chip";

const AUDIENCES = ["Freelance SDRs", "Agency founders", "Job-seekers prepping interviews", "Solo outbound teams"];

export function TrustStrip() {
  return (
    <section className="border-y border-zinc-200/70 bg-zinc-50 py-10 dark:border-zinc-800 dark:bg-zinc-950/50">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Built for people who dial for a living
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {AUDIENCES.map((audience) => (
            <Chip key={audience}>{audience}</Chip>
          ))}
        </div>
      </div>
    </section>
  );
}

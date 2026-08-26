import { Card } from "@/components/ui/Card";

const AUDIENCE_CARDS = [
  {
    icon: "🎯",
    title: "Sales reps",
    description: "Warm up on a realistic, objection-throwing prospect before you spend a real lead on a bad opening.",
  },
  {
    icon: "🎤",
    title: "Job-seekers",
    description: "Got a roleplay interview coming up? Rehearse the exact scenario against an AI that pushes back like a real panel would.",
  },
  {
    icon: "🚀",
    title: "Founders & small teams",
    description: "Doing your own outbound with no sales background? Practice the call before you make it — no sales call required to try it.",
  },
];

export function WhoItsFor() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Who it&apos;s for</h2>
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {AUDIENCE_CARDS.map((card) => (
          <Card key={card.title} icon={card.icon} title={card.title}>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{card.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

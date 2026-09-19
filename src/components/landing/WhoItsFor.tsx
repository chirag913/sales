import { RevealOnScroll } from "@/components/landing/RevealOnScroll";

const AUDIENCES = [
  {
    label: "Outbound & appointment-setting teams",
    copy: "Get every caller through realistic first calls with a US, UK, Canadian or Australian prospect before they touch your live list.",
  },
  {
    label: "BPO & call-centre trainers",
    copy: "Give new hires unlimited practice on real objections, with a specific score and feedback after every call.",
  },
  {
    label: "Team leads & managers",
    copy: "See where each caller is strong or stuck, and check they're ready before the calls that count.",
  },
];

export function WhoItsFor() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
      <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
        Built for outbound and appointment-setting teams calling international prospects.
      </h2>

      <div className="mt-16 grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-8">
        {AUDIENCES.map((audience, i) => (
          <RevealOnScroll key={audience.label} delayMs={i * 100} className="border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{audience.label}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{audience.copy}</p>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}

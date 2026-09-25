import { TrackedLink } from "@/components/home/TrackedLink";
import { RevealOnScroll } from "@/components/landing/RevealOnScroll";
import { PRIMARY_LINK_CLASSES, SECONDARY_LINK_CLASSES } from "@/components/ui/linkButtonClasses";

const STANDARD_FEATURES = [
  "AI calls new leads",
  "Lead qualification",
  "Up to 3 call attempts per lead",
  "Call outcomes",
  "Sales-ready summaries",
  "Google Sheets",
  "Basic reporting",
];

interface Plan {
  id: "starter" | "growth" | "scale" | "high-volume";
  name: string;
  price: string;
  priceSuffix?: string;
  volume: string;
  features: string[];
  cta: string;
  recommended?: boolean;
  custom?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "₹19,999",
    priceSuffix: "/month",
    volume: "Up to 500 new leads / month",
    features: STANDARD_FEATURES,
    cta: "Get Started",
  },
  {
    id: "growth",
    name: "Growth",
    price: "₹29,999",
    priceSuffix: "/month",
    volume: "Up to 1,000 new leads / month",
    features: STANDARD_FEATURES,
    cta: "Get Started",
    recommended: true,
  },
  {
    id: "scale",
    name: "Scale",
    price: "₹59,999",
    priceSuffix: "/month",
    volume: "Up to 2,500 new leads / month",
    features: [...STANDARD_FEATURES, "Higher-volume calling"],
    cta: "Talk to Us",
  },
  {
    id: "high-volume",
    name: "High Volume",
    price: "Custom",
    volume: "5,000+ new leads / month",
    features: [
      "Custom calling capacity",
      "Custom qualification flow",
      "CRM / workflow integration",
      "Custom reporting",
      "Dedicated implementation",
    ],
    cta: "Talk to Sales",
    custom: true,
  },
];

function Check() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-[3px] shrink-0 text-teal-600 dark:text-teal-400"
    >
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const ctaClasses = plan.recommended ? PRIMARY_LINK_CLASSES : SECONDARY_LINK_CLASSES;

  return (
    <div
      className={`flex h-full flex-col rounded-2xl p-6 ${
        plan.recommended
          ? "border-2 border-zinc-900 bg-white dark:border-zinc-50 dark:bg-zinc-950"
          : plan.custom
            ? "border border-dashed border-zinc-300 bg-zinc-50/60 dark:border-zinc-700 dark:bg-zinc-900/30"
            : "border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          {plan.name}
        </p>
        {plan.recommended && (
          <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-teal-700 dark:text-teal-400">
            Recommended
          </span>
        )}
      </div>

      <div className="mt-4">
        {plan.custom ? (
          <p className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{plan.price}</p>
        ) : (
          <p className="flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{plan.price}</span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{plan.priceSuffix}</span>
          </p>
        )}
      </div>

      <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{plan.volume}</p>

      {plan.custom && (
        <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Built around your lead volume, connect rate and average conversation duration.
        </p>
      )}

      <ul className="mt-6 flex flex-1 flex-col gap-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-300">
            <Check />
            {f}
          </li>
        ))}
      </ul>

      <TrackedLink
        href="/#get-started"
        event="pricing_cta_clicked"
        eventProps={{ plan: plan.id }}
        className={`${ctaClasses} mt-7 w-full`}
      >
        {plan.cta}
      </TrackedLink>
    </div>
  );
}

export function PricingCards() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-10">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan, i) => (
          <RevealOnScroll key={plan.id} delayMs={i * 60} className="h-full">
            <PlanCard plan={plan} />
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}

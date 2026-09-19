import { RevealOnScroll } from "@/components/landing/RevealOnScroll";
import { DetailRow, IllustrativeTag, Section, SectionHeading } from "@/components/home/parts";

const FLOW = ["Meta ad", "Lead", "AI call", "Qualification", "Sales rep", "Site visit"];

// A worked example of the workflow for a real-estate enquiry. It is not a
// customer case study and does not describe any real result.
export function RealEstate() {
  return (
    <Section id="real-estate">
      <SectionHeading
        eyebrow="Real Estate"
        title="Built for businesses where every lead matters."
        description="A buyer who enquires about a project is often comparing several, so a fast, relevant conversation matters."
      />

      <div className="mt-14 grid grid-cols-1 items-start gap-8 lg:grid-cols-5 lg:gap-12">
        <RevealOnScroll className="lg:col-span-3">
          <ol className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {FLOW.map((step, i) => {
              const last = i === FLOW.length - 1;
              return (
                <li
                  key={step}
                  className={`flex flex-col gap-3 rounded-xl border px-4 py-4 ${
                    last
                      ? "border-teal-600/40 bg-teal-50/60 dark:border-teal-400/30 dark:bg-teal-400/5"
                      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                  }`}
                >
                  <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{String(i + 1).padStart(2, "0")}</span>
                  <span
                    className={`font-mono text-xs font-medium uppercase tracking-wide ${
                      last ? "text-teal-700 dark:text-teal-400" : "text-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    {step}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">
            This is an example of how a lead could be summarised, not a customer case study.
          </p>
        </RevealOnScroll>

        <RevealOnScroll className="lg:col-span-2" delayMs={100}>
          <figure
            aria-label="Illustrative example of a qualified real estate lead"
            className="shadow-premium overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
          >
            <figcaption className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-900">
              <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Lead summary
              </span>
              <IllustrativeTag />
            </figcaption>
            <dl className="px-5 py-3">
              <DetailRow label="Project" value="F Premiere" />
              <DetailRow label="Lead" value="High-intent buyer" />
              <DetailRow label="Requirement" value="3 BHK" />
              <DetailRow label="Budget" value="₹1.5–2 Cr" />
              <DetailRow label="Purpose" value="Investment" />
              <DetailRow label="Next step" value="Site visit" />
            </dl>
          </figure>
        </RevealOnScroll>
      </div>

    </Section>
  );
}

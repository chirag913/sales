import { RevealOnScroll } from "@/components/landing/RevealOnScroll";
import { DetailRow, IllustrativeTag, Section, SectionHeading } from "@/components/home/parts";
import { ViewTracker } from "@/components/home/ViewTracker";

const STEPS = [
  { n: "01", title: "Lead submits Meta form", text: "A new enquiry comes in from your ad." },
  { n: "02", title: "BetterCallz receives the lead", text: "The lead's details reach BetterCallz the moment they're submitted." },
  { n: "03", title: "AI starts the conversation", text: "The lead gets a call, while their interest is still fresh." },
  { n: "04", title: "AI qualifies intent", text: "Budget, timeline and what they're actually looking for." },
  { n: "05", title: "Sales team receives the result", text: "A structured summary, so your team starts with context." },
];

const MESSAGES: { from: "AI" | "LEAD"; text: string }[] = [
  { from: "AI", text: "Hi Rahul, you recently enquired about the 3 BHK options. Is now a good time for a quick conversation?" },
  { from: "LEAD", text: "Yes, I'm comparing a few projects." },
  { from: "AI", text: "Got it. Are you looking for something for yourself or as an investment?" },
  { from: "LEAD", text: "Investment." },
];

function ConversationMockup() {
  return (
    <figure
      aria-label="Illustrative example of a qualification conversation"
      className="shadow-premium overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
    >
      <figcaption className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-900">
        <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Conversation
        </span>
        <IllustrativeTag />
      </figcaption>

      <div className="flex flex-col gap-3 px-5 py-5">
        {MESSAGES.map((m, i) => (
          <div key={i} className={`flex ${m.from === "LEAD" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[85%]">
              <p
                className={`mb-1 font-mono text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 ${
                  m.from === "LEAD" ? "text-right" : ""
                }`}
              >
                {m.from === "AI" ? "AI" : "Lead"}
              </p>
              <p
                className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.from === "AI"
                    ? "rounded-tl-sm bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                    : "rounded-tr-sm bg-teal-700 text-white dark:bg-teal-400 dark:text-zinc-950"
                }`}
              >
                {m.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-4 dark:border-zinc-900 dark:bg-zinc-900/30">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-teal-700 dark:text-teal-400">
            Qualified lead
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Summary for your team</span>
        </div>
        <dl className="mt-2">
          <DetailRow label="Intent" value="High" />
          <DetailRow label="Budget" value="₹1.5–2 Cr" />
          <DetailRow label="Timeline" value="30 days" />
          <DetailRow label="Purpose" value="Investment" />
          <DetailRow label="Next step" value="Site visit" />
        </dl>
      </div>
    </figure>
  );
}

export function InstantCalling() {
  return (
    <Section id="instant-calling">
      <ViewTracker event="instant_calling_view" />
      <SectionHeading
        eyebrow="Instant Lead Calling"
        title="From lead to conversation in seconds."
        description="The workflow BetterCallz is built around, from the moment a lead submits your form to the moment your team knows what to do next."
      />

      <div className="mt-14 grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-16">
        <ol className="flex flex-col">
          {STEPS.map((step, i) => (
            <li key={step.n} className="border-t border-zinc-200 py-5 first:border-t-0 first:pt-0 dark:border-zinc-800">
              <RevealOnScroll delayMs={i * 60} className="flex gap-5">
                <span className="font-mono text-sm font-medium text-teal-700 dark:text-teal-400">{step.n}</span>
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{step.text}</p>
                </div>
              </RevealOnScroll>
            </li>
          ))}
        </ol>

        <div>
          <RevealOnScroll>
            <ConversationMockup />
          </RevealOnScroll>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            An illustrative example of the intended workflow, not a recording or a customer result. Ask for a custom AI call
            below to see how it could work for your business.
          </p>
        </div>
      </div>
    </Section>
  );
}

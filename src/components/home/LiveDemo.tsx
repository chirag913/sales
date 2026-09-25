import { TalkToUsLink, TryDemoLink } from "@/components/home/CtaLinks";
import { Eyebrow, Section } from "@/components/home/parts";
import { PRIMARY_LINK_CLASSES, SECONDARY_LINK_CLASSES } from "@/components/ui/linkButtonClasses";

export function LiveDemo() {
  return (
    <Section id="demo" className="text-center">
      <Eyebrow>See it in action</Eyebrow>
      <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance text-zinc-900 dark:text-zinc-50 sm:text-5xl sm:leading-[1.1]">
        <span className="block">Don&apos;t take our word for it.</span>
        <span className="block">Hear the AI call a lead.</span>
      </h2>
      <p className="mt-5 text-lg text-zinc-500 dark:text-zinc-400">Experience a real BetterCallz AI sales conversation.</p>
      <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
        <TryDemoLink from="live_demo" className={`${PRIMARY_LINK_CLASSES} px-7 py-3.5 text-base`} />
        <TalkToUsLink from="live_demo" className={`${SECONDARY_LINK_CLASSES} px-7 py-3.5 text-base`} />
      </div>
    </Section>
  );
}

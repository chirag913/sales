"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CallPanelHeader,
  CoachCallout,
  MessageBubble,
  ScoreReadout,
  TypingDots,
} from "@/components/landing/LiveCallDemo";
import { PRIMARY_LINK_CLASSES } from "@/components/ui/linkButtonClasses";

const PANEL_CLASSES =
  "w-full max-w-md rounded-3xl border border-zinc-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_60px_-20px_rgba(0,0,0,0.15)] transition-transform duration-200 ease-out hover:-translate-y-1 dark:border-zinc-800 dark:bg-zinc-950";

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-100 py-2.5 last:border-0 dark:border-zinc-900">
      <span className="font-mono text-[10px] font-medium tracking-widest text-zinc-400 dark:text-zinc-600">
        {label}
      </span>
      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{value}</span>
    </div>
  );
}

function PreparingPanel() {
  return (
    <div className={PANEL_CLASSES}>
      <p className="font-mono text-[10px] font-medium tracking-widest text-zinc-400 dark:text-zinc-600">
        PREPARING CALL
      </p>
      <div className="mt-6 flex items-center gap-3 py-6">
        <TypingDots />
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Setting up your prospect…</span>
      </div>
    </div>
  );
}

function ProspectConfigPanel() {
  return (
    <div className={PANEL_CLASSES}>
      <p className="font-mono text-[10px] font-medium tracking-widest text-zinc-400 dark:text-zinc-600">
        YOUR PROSPECT
      </p>
      <div className="mt-3">
        <ConfigRow label="INDUSTRY" value="Commercial Cleaning" />
        <ConfigRow label="ROLE" value="Owner" />
        <ConfigRow label="STYLE" value="Skeptical" />
      </div>
    </div>
  );
}

function OpeningPanel() {
  return (
    <div className={PANEL_CLASSES}>
      <CallPanelHeader name="James Miller" meta="Owner · ABC Commercial Cleaning" timer="00:06" />
      <div className="mt-4">
        <MessageBubble speaker="you" text="Hi James — got 30 seconds? I work with commercial cleaning owners like you." />
      </div>
    </div>
  );
}

function PushbackPanel() {
  return (
    <div className={PANEL_CLASSES}>
      <CallPanelHeader name="James Miller" meta="Owner · ABC Commercial Cleaning" timer="00:14" />
      <div className="mt-4 space-y-3">
        <MessageBubble speaker="you" text="Hi James — got 30 seconds? I work with commercial cleaning owners like you." />
        <MessageBubble speaker="prospect" text="We've mostly relied on referrals." />
      </div>
    </div>
  );
}

function CoachPanelDemo() {
  return (
    <div className={PANEL_CLASSES}>
      <p className="font-mono text-[10px] font-medium tracking-widest text-zinc-400 dark:text-zinc-600">
        COACH REVIEW
      </p>
      <div className="mt-3">
        <CoachCallout
          tag="OBJECTION DETECTED"
          insight="You pitched before learning how they already get clients."
          betterMove="Ask how referrals are working for them today."
        />
      </div>
    </div>
  );
}

function ScorePanel() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setActive(true), 150);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className={PANEL_CLASSES}>
      <p className="font-mono text-[10px] font-medium tracking-widest text-zinc-400 dark:text-zinc-600">
        CALL COMPLETE
      </p>
      <div className="mt-3">
        <ScoreReadout value={68} active={active} />
      </div>
      <Link href="/practice" className={`${PRIMARY_LINK_CLASSES} mt-4 w-full justify-center`}>
        Start 2 Free Calls
      </Link>
    </div>
  );
}

const BEATS: { eyebrow: string; title: string; body: string; visual: () => ReactNode }[] = [
  {
    eyebrow: "01",
    title: "Before the real call.",
    body: "Set who you're calling and what you're selling — before you spend a real lead finding out live.",
    visual: () => <PreparingPanel />,
  },
  {
    eyebrow: "02",
    title: "Choose who you're calling.",
    body: "Pick the industry, the decision-maker, and how tough they should be.",
    visual: () => <ProspectConfigPanel />,
  },
  {
    eyebrow: "03",
    title: "Now make the call.",
    body: "Dial in and open exactly like you would on a real one.",
    visual: () => <OpeningPanel />,
  },
  {
    eyebrow: "04",
    title: "They push back.",
    body: "A realistic AI prospect that doesn't make it easy on you.",
    visual: () => <PushbackPanel />,
  },
  {
    eyebrow: "05",
    title: "Know exactly what went wrong.",
    body: "The coach flags the moment you lost ground — and what to say instead.",
    visual: () => <CoachPanelDemo />,
  },
  {
    eyebrow: "06",
    title: "Try again.",
    body: "See your score, see what to fix, and dial the next one better.",
    visual: () => <ScorePanel />,
  },
];

export function CallJourney() {
  const [activeIndex, setActiveIndex] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = refs.current.findIndex((el) => el === entry.target);
            if (index !== -1) setActiveIndex(index);
          }
        });
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 },
    );

    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section aria-label="How a BetterCallz call goes" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <div className="lg:grid lg:grid-cols-[1fr_minmax(280px,380px)] lg:gap-16">
        <div className="flex flex-col gap-24 sm:gap-32">
          {BEATS.map((beat, i) => (
            <div
              key={beat.title}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className="flex flex-col gap-5"
            >
              <span className="font-mono text-xs font-medium tracking-widest text-emerald-600 dark:text-emerald-400">
                {beat.eyebrow}
              </span>
              <h3 className="max-w-md text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
                {beat.title}
              </h3>
              <p className="max-w-sm text-zinc-500 dark:text-zinc-400">{beat.body}</p>

              <div className="mt-2 lg:hidden">{beat.visual()}</div>
            </div>
          ))}
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-28 flex justify-center">{BEATS[activeIndex].visual()}</div>
        </div>
      </div>
    </section>
  );
}

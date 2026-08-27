"use client";

import { useEffect, useState } from "react";
import { useCountUp } from "@/lib/hooks/useCountUp";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

/* ------------------------------------------------------------------ */
/* Shared call-panel visual atoms — the signature BetterCallz visual  */
/* language (live status, waveform, transcript, coach, score). Reused */
/* by the hero demo and by CallJourney's scroll-synced snapshots.     */
/* ------------------------------------------------------------------ */

export function LiveBadge({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-widest text-emerald-600 dark:text-emerald-400">
      <span className="relative flex h-2 w-2">
        <span className="animate-live-pulse absolute inline-block h-2 w-2 rounded-full bg-emerald-500" />
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      {label}
    </span>
  );
}

export function Waveform({ active = true }: { active?: boolean }) {
  const heights = [40, 70, 100, 55, 85, 45, 65];
  return (
    <div className="flex h-4 items-center gap-[3px]" aria-hidden>
      {heights.map((h, i) => (
        <span
          key={i}
          className={`w-[2.5px] rounded-full bg-zinc-300 dark:bg-zinc-700 ${active ? "animate-live-pulse" : ""}`}
          style={{
            height: `${h}%`,
            animationDelay: `${i * 0.12}s`,
            animationDuration: `${1.1 + (i % 3) * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

export function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="animate-live-pulse h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export function MessageBubble({ speaker, text }: { speaker: "you" | "prospect"; text: string }) {
  const isYou = speaker === "you";
  return (
    <div className={`flex flex-col gap-1 ${isYou ? "items-end" : "items-start"}`}>
      <span className="font-mono text-[10px] font-medium tracking-widest text-zinc-400 dark:text-zinc-600">
        {isYou ? "YOU" : "PROSPECT"}
      </span>
      <div
        className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug sm:text-sm ${
          isYou
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

export function CoachCallout({
  tag,
  insight,
  betterMove,
}: {
  tag: string;
  insight: string;
  betterMove: string;
}) {
  return (
    <div className="rounded-2xl border border-emerald-600/25 bg-emerald-50/70 p-3.5 dark:border-emerald-500/25 dark:bg-emerald-950/30">
      <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-widest text-emerald-700 dark:text-emerald-400">
        <span aria-hidden>✦</span> AI COACH
      </p>
      <p className="mt-1.5 font-mono text-[10px] font-medium tracking-wide text-zinc-500 dark:text-zinc-400">{tag}</p>
      <p className="mt-1 text-[13px] leading-snug text-zinc-800 dark:text-zinc-200 sm:text-sm">
        &ldquo;{insight}&rdquo;
      </p>
      <p className="mt-2 text-[13px] leading-snug text-zinc-600 dark:text-zinc-400 sm:text-sm">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">Better move:</span> &ldquo;{betterMove}&rdquo;
      </p>
    </div>
  );
}

export function ScoreReadout({ value, active, label = "CALL SCORE" }: { value: number; active: boolean; label?: string }) {
  const display = useCountUp(value, active);
  return (
    <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
      <span className="font-mono text-[11px] font-medium tracking-widest text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{display}/100</span>
    </div>
  );
}

export function CallPanelHeader({
  name,
  meta,
  timer,
}: {
  name: string;
  meta: string;
  timer: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <LiveBadge />
        <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{name}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{meta}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="font-mono text-xs tabular-nums text-zinc-400 dark:text-zinc-600">{timer}</span>
        <Waveform />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero demo: the cinematic, self-playing version of the call panel.  */
/* ------------------------------------------------------------------ */

const YOU_LINE = "We help commercial cleaning companies generate more qualified appointments.";
const PROSPECT_LINE = "We're actually doing pretty well with referrals right now.";
const COACH_TAG = "OBJECTION DETECTED";
const COACH_INSIGHT = "You pitched before understanding their current process.";
const COACH_BETTER_MOVE = "Ask how referrals are working for them right now.";
const SCORE = 74;

type Step = "identity" | "you" | "typing" | "prospect" | "coach" | "score";

const STEP_ORDER: Step[] = ["identity", "you", "typing", "prospect", "coach", "score"];
const STEP_DELAYS_MS = [0, 700, 1700, 2700, 3800, 4900];

export function LiveCallDemo() {
  const reducedMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const timers = STEP_DELAYS_MS.map((delay, i) => setTimeout(() => setStepIndex(i), delay));
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion]);

  const step = reducedMotion ? STEP_ORDER[STEP_ORDER.length - 1] : STEP_ORDER[stepIndex];
  const atLeast = (s: Step) => STEP_ORDER.indexOf(step) >= STEP_ORDER.indexOf(s);

  return (
    <div
      className="w-full max-w-sm shrink-0 rounded-3xl border border-zinc-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_60px_-20px_rgba(0,0,0,0.15)] dark:border-zinc-800 dark:bg-zinc-950"
      role="group"
      aria-label="Example BetterCallz practice call"
    >
      <CallPanelHeader name="James Miller" meta="Owner · ABC Commercial Cleaning" timer="03:42" />

      <div className="mt-4 min-h-[64px] space-y-3">
        {atLeast("you") && <MessageBubble speaker="you" text={YOU_LINE} />}
        {step === "typing" && (
          <div className="flex flex-col items-start gap-1">
            <span className="font-mono text-[10px] font-medium tracking-widest text-zinc-400 dark:text-zinc-600">
              PROSPECT
            </span>
            <div className="rounded-2xl bg-zinc-100 dark:bg-zinc-900">
              <TypingDots />
            </div>
          </div>
        )}
        {atLeast("prospect") && <MessageBubble speaker="prospect" text={PROSPECT_LINE} />}
      </div>

      <div
        className={`mt-4 grid transition-[grid-template-rows,opacity] duration-500 ease-out ${
          atLeast("coach") ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <CoachCallout tag={COACH_TAG} insight={COACH_INSIGHT} betterMove={COACH_BETTER_MOVE} />
        </div>
      </div>

      <div
        className={`mt-3 transition-opacity duration-500 ease-out ${atLeast("score") ? "opacity-100" : "opacity-0"}`}
      >
        <ScoreReadout value={SCORE} active={step === "score"} />
      </div>
    </div>
  );
}

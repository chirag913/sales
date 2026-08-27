"use client";

import { useEffect, useState } from "react";
import { useCountUp } from "@/lib/hooks/useCountUp";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function bandColor(score: number): { stroke: string; text: string } {
  if (score >= 80) return { stroke: "#10b981", text: "text-emerald-600 dark:text-emerald-400" }; // emerald-500
  if (score >= 60) return { stroke: "#d97706", text: "text-amber-600 dark:text-amber-400" }; // amber-600
  return { stroke: "#dc2626", text: "text-red-600 dark:text-red-400" }; // red-600
}

export function ScoreGauge({ value }: { value: number }) {
  const [active, setActive] = useState(false);
  const display = useCountUp(value, active, 1100);
  const { stroke, text } = bandColor(value);

  useEffect(() => {
    const t = setTimeout(() => setActive(true), 100);
    return () => clearTimeout(t);
  }, []);

  const offset = CIRCUMFERENCE * (1 - (active ? value : 0) / 100);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg viewBox="0 0 120 120" width={168} height={168} className="-rotate-90">
        <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="10" className="stroke-zinc-100 dark:stroke-zinc-900" />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke={stroke}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-4xl font-semibold tabular-nums ${text}`}>{display}</span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">out of 100</span>
      </div>
    </div>
  );
}

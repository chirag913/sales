"use client";

import { RefObject, useEffect, useRef } from "react";
import { CallStatus } from "@/lib/realtime/useRealtimeCall";
import { ProspectIdentity } from "@/lib/types";

interface AmplitudeOrbProps {
  amplitudeRef: RefObject<number>;
  label: string;
  colorClass: string;
}

// Per-bar phase/weight so bars don't move in lockstep — purely cosmetic variation
// layered on top of the real amplitude value, not synthetic data.
const BAR_PROFILE = [0.6, 0.85, 1, 0.85, 0.6];

function AmplitudeBars({ amplitudeRef, label, colorClass }: AmplitudeOrbProps) {
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let frame: number;
    const tick = () => {
      const amplitude = Math.min(Math.max(amplitudeRef.current ?? 0, 0), 1);
      const now = performance.now();
      barRefs.current.forEach((bar, i) => {
        if (!bar) return;
        const wobble = 0.85 + 0.15 * Math.sin(now / 180 + i * 1.3);
        const heightPercent = 14 + amplitude * 86 * BAR_PROFILE[i] * wobble;
        bar.style.height = `${heightPercent}%`;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [amplitudeRef]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-24 items-end gap-1.5 sm:h-32">
        {BAR_PROFILE.map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              barRefs.current[i] = el;
            }}
            className={`w-2.5 rounded-full sm:w-3 ${colorClass}`}
            style={{ height: "14%", willChange: "height" }}
          />
        ))}
      </div>
      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{label}</p>
    </div>
  );
}

interface CallVisualProps {
  userAmplitudeRef: RefObject<number>;
  prospectAmplitudeRef: RefObject<number>;
  identity: ProspectIdentity;
  status: CallStatus;
}

export function CallVisual({ userAmplitudeRef, prospectAmplitudeRef, identity, status }: CallVisualProps) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-10 rounded-2xl border border-zinc-200/70 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:gap-20">
      <AmplitudeBars amplitudeRef={userAmplitudeRef} label="You" colorClass="bg-zinc-900 dark:bg-zinc-100" />
      <AmplitudeBars amplitudeRef={prospectAmplitudeRef} label={identity.firstName} colorClass="bg-emerald-500" />
      {(status === "idle" || status === "connecting") && (
        <p className="absolute bottom-6 text-xs text-zinc-400 dark:text-zinc-500">Connecting…</p>
      )}
    </div>
  );
}

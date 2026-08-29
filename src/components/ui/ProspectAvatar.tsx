"use client";

import { RefObject, useEffect, useId, useRef } from "react";
import { ProspectIdentity } from "@/lib/types";

// Soft, low-saturation gradient pairs — avatar background variety without
// expanding the app's actual accent-color language (still just muted zinc-
// adjacent tones, chosen deterministically per prospect so the same person
// always gets the same avatar).
// Exported for reuse by InitialsAvatar (team roster) — same deterministic,
// low-saturation coloring language, applied to real people instead of
// generated prospects.
export const AVATAR_PALETTES: [string, string][] = [
  ["#d9e8e0", "#a9c7b7"], // sage
  ["#e7ddd3", "#c9ab8f"], // clay
  ["#dbe1ea", "#a9b9cf"], // slate-blue
  ["#e6e2da", "#c4bcae"], // stone
];

export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const SIZE_PX: Record<"sm" | "md" | "lg" | "xl", number> = {
  sm: 32,
  md: 56,
  lg: 96,
  xl: 144,
};

interface ProspectAvatarProps {
  identity: Pick<ProspectIdentity, "fullName" | "gender">;
  size?: "sm" | "md" | "lg" | "xl";
  active?: boolean;
  amplitudeRef?: RefObject<number>;
  className?: string;
}

export function ProspectAvatar({ identity, size = "md", active = false, amplitudeRef, className = "" }: ProspectAvatarProps) {
  const gradientId = useId();
  const ringRef = useRef<SVGCircleElement | null>(null);
  const hash = hashString(identity.fullName);
  const [from, to] = AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
  const skew = ((hash % 7) - 3) * 0.6; // small deterministic jitter, purely cosmetic variety
  const px = SIZE_PX[size];

  useEffect(() => {
    if (!amplitudeRef) return;
    let frame: number;
    const tick = () => {
      const amplitude = Math.min(Math.max(amplitudeRef.current ?? 0, 0), 1);
      if (ringRef.current) {
        ringRef.current.setAttribute("r", String(46 + amplitude * 6));
        ringRef.current.setAttribute("stroke-opacity", String(0.35 + amplitude * 0.55));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [amplitudeRef]);

  return (
    <svg
      viewBox="0 0 100 100"
      width={px}
      height={px}
      className={`shrink-0 ${className}`}
      role="img"
      aria-label={`${identity.fullName}'s avatar`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>

      <circle cx="50" cy="50" r="49" fill={`url(#${gradientId})`} />

      {amplitudeRef ? (
        <circle
          ref={ringRef}
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          strokeOpacity="0.35"
        />
      ) : active ? (
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          className="animate-live-pulse origin-center"
        />
      ) : null}

      <g transform={`rotate(${skew} 50 50)`} fill="rgba(255,255,255,0.92)">
        <path d="M18 100 C18 74 32 54 50 54 C68 54 82 74 82 100 Z" />
        {identity.gender === "female" && (
          <path d="M50 20 C36 20 26 32 26 46 C26 54 28 62 32 68 L36 68 C33 60 32 52 32 46 C32 34 40 26 50 26 C60 26 68 34 68 46 C68 52 67 60 64 68 L68 68 C72 62 74 54 74 46 C74 32 64 20 50 20 Z" />
        )}
        <circle cx="50" cy="40" r="18" />
      </g>
    </svg>
  );
}

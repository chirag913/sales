"use client";

import { ReactNode, useId } from "react";
import { Globe } from "lucide-react";
import { ProspectMarket } from "@/lib/types";

// Real inline SVG flags instead of flag emoji (🇺🇸/🇮🇳) — those are two
// combined Unicode "regional indicator" characters, not an image, so their
// appearance depends entirely on the OS's installed emoji font. Phone OSes
// ship complete flag coverage; many desktop OS/browser combos (notably
// Windows) don't, and silently fall back to a blank box. Plain SVG paths
// render identically everywhere, with no font dependency at all.
//
// US/UK/Canada/Australia get real flag art; "Other" gets a plain globe.

function FlagUS({ className }: { className?: string }) {
  const clipId = useId();
  return (
    <svg viewBox="0 0 30 20" className={className} role="img" aria-label="United States flag">
      <clipPath id={clipId}>
        <rect width="30" height="20" rx="2" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect width="30" height="20" fill="#fff" />
        {[0, 1.54, 3.08, 4.62, 6.16, 7.7, 9.24, 10.78, 12.32, 13.86, 15.4, 16.94, 18.48].map((y, i) =>
          i % 2 === 0 ? <rect key={y} x="0" y={y} width="30" height="1.54" fill="#b22234" /> : null
        )}
        <rect x="0" y="0" width="13" height="10.78" fill="#3c3b6e" />
        {[2, 4.4, 6.8, 9.2].map((y, row) =>
          [1.5, 4, 6.5, 9, 11.5].map((x, col) => (
            <circle
              key={`${row}-${col}`}
              cx={x + (row % 2 === 1 ? 1.25 : 0)}
              cy={y}
              r="0.45"
              fill="#fff"
            />
          ))
        )}
      </g>
    </svg>
  );
}

function FlagFrame({ className, label, children }: { className?: string; label: string; children: ReactNode }) {
  const clipId = useId();
  return (
    <svg viewBox="0 0 30 20" className={className} role="img" aria-label={label}>
      <clipPath id={clipId}>
        <rect width="30" height="20" rx="2" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>{children}</g>
    </svg>
  );
}

// Union Jack in a 30x20 box (used directly for the UK, and as the canton of
// Australia via a nested scaled <svg>).
function UnionJack() {
  return (
    <>
      <rect width="30" height="20" fill="#012169" />
      <path d="M0 0L30 20M30 0L0 20" stroke="#fff" strokeWidth="4" />
      <path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" strokeWidth="1.6" />
      <path d="M15 0V20M0 10H30" stroke="#fff" strokeWidth="6.5" />
      <path d="M15 0V20M0 10H30" stroke="#c8102e" strokeWidth="4" />
    </>
  );
}

function FlagUK({ className }: { className?: string }) {
  return (
    <FlagFrame className={className} label="United Kingdom flag">
      <UnionJack />
    </FlagFrame>
  );
}

function FlagCanada({ className }: { className?: string }) {
  return (
    <FlagFrame className={className} label="Canada flag">
      <rect width="30" height="20" fill="#fff" />
      <rect width="7.5" height="20" fill="#d52b1e" />
      <rect x="22.5" width="7.5" height="20" fill="#d52b1e" />
      <path
        d="M15 3.2l1.3 2.6 1.6-.7-.6 4.1 1.9-1.5.5 1.2 2-.3-.9 2.8.8.5-3.7 3.1.3 1.1-3.2-.5v3.4h-.9v-3.4l-3.2.5.3-1.1-3.7-3.1.8-.5-.9-2.8 2 .3.5-1.2 1.9 1.5-.6-4.1 1.6.7z"
        fill="#d52b1e"
      />
    </FlagFrame>
  );
}

function FlagAustralia({ className }: { className?: string }) {
  const star = (cx: number, cy: number, r: number) => {
    const pts = Array.from({ length: 14 }, (_, i) => {
      const rad = (i * Math.PI) / 7 - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.45;
      return `${cx + rr * Math.cos(rad)},${cy + rr * Math.sin(rad)}`;
    }).join(" ");
    return <polygon points={pts} fill="#fff" />;
  };
  return (
    <FlagFrame className={className} label="Australia flag">
      <rect width="30" height="20" fill="#012169" />
      <svg width="15" height="10" viewBox="0 0 30 20">
        <UnionJack />
      </svg>
      {star(7.5, 15, 2.2)}
      {star(22, 15.5, 1.6)}
      {star(25.5, 8, 1.3)}
      {star(19, 7, 1.3)}
      {star(22, 3, 1.6)}
    </FlagFrame>
  );
}

interface MarketFlagProps {
  market: ProspectMarket;
  className?: string;
}

export function MarketFlag({ market, className = "h-5 w-[1.875rem]" }: MarketFlagProps) {
  if (market === "US") return <FlagUS className={className} />;
  if (market === "UK") return <FlagUK className={className} />;
  if (market === "Canada") return <FlagCanada className={className} />;
  if (market === "Australia") return <FlagAustralia className={className} />;
  return <Globe className={className} aria-hidden />;
}

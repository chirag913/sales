"use client";

import { useId } from "react";
import { Globe } from "lucide-react";
import { ProspectMarket } from "@/lib/types";

// Real inline SVG flags instead of flag emoji (🇺🇸/🇮🇳) — those are two
// combined Unicode "regional indicator" characters, not an image, so their
// appearance depends entirely on the OS's installed emoji font. Phone OSes
// ship complete flag coverage; many desktop OS/browser combos (notably
// Windows) don't, and silently fall back to a blank box. Plain SVG paths
// render identically everywhere, with no font dependency at all.
//
// Only the two markets PROSPECT_MARKET_OPTIONS actually offers get real
// flag art (US, India) — "Other" and any legacy market a returning user's
// profile might still carry (UK/Canada/Australia, no longer selectable,
// see the ProspectMarket comment in types.ts) fall back to a plain globe
// icon rather than drawing three more flags nobody can pick anymore.

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

function FlagIndia({ className }: { className?: string }) {
  const clipId = useId();
  return (
    <svg viewBox="0 0 30 20" className={className} role="img" aria-label="India flag">
      <clipPath id={clipId}>
        <rect width="30" height="20" rx="2" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect width="30" height="20" fill="#fff" />
        <rect width="30" height="6.67" fill="#ff9933" />
        <rect y="13.33" width="30" height="6.67" fill="#138808" />
        <circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" strokeWidth="0.3" />
        <circle cx="15" cy="10" r="0.4" fill="#000080" />
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 360) / 24;
          const rad = (angle * Math.PI) / 180;
          const x2 = 15 + 2.6 * Math.sin(rad);
          const y2 = 10 - 2.6 * Math.cos(rad);
          const x1 = 15 + 0.4 * Math.sin(rad);
          const y1 = 10 - 0.4 * Math.cos(rad);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000080" strokeWidth="0.15" />;
        })}
      </g>
    </svg>
  );
}

interface MarketFlagProps {
  market: ProspectMarket;
  className?: string;
}

export function MarketFlag({ market, className = "h-5 w-[1.875rem]" }: MarketFlagProps) {
  if (market === "US") return <FlagUS className={className} />;
  if (market === "India") return <FlagIndia className={className} />;
  return <Globe className={className} aria-hidden />;
}

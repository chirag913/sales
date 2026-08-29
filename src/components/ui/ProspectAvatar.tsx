"use client";

import { RefObject, useEffect, useId, useRef, useState } from "react";
import { ProspectIdentity } from "@/lib/types";

// Real headshot pools, one per gender — the primary visual. Indexed by the
// same deterministic hash as AVATAR_PALETTES below (hashString(fullName)),
// so a given persona always resolves to the same photo everywhere
// ProspectAvatar is used (ScenarioPicker, ReadyToCall, CallVisual,
// CallResultDetail, CallHistoryList, CallScreen all render the same
// identity object, so they naturally stay in sync).
const MALE_AVATAR_PHOTOS = ["/avatars/male/m1.png", "/avatars/male/m2.png", "/avatars/male/m3.png", "/avatars/male/m4.png"];
const FEMALE_AVATAR_PHOTOS = ["/avatars/female/f1.png", "/avatars/female/f2.png", "/avatars/female/f3.png", "/avatars/female/f4.png"];

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
  const clipId = useId();
  const ringRef = useRef<SVGCircleElement | null>(null);
  const hash = hashString(identity.fullName);
  const [from, to] = AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
  const skew = ((hash % 7) - 3) * 0.6; // small deterministic jitter, purely cosmetic variety
  const px = SIZE_PX[size];

  const photoPool = identity.gender === "female" ? FEMALE_AVATAR_PHOTOS : MALE_AVATAR_PHOTOS;
  const photoSrc = photoPool[hash % photoPool.length];
  const [photoFailed, setPhotoFailed] = useState(false);
  // Reset the failure flag when the resolved photo actually changes
  // (identity/gender changed on an already-mounted instance) — adjusting
  // state during render rather than in an effect, per React's guidance for
  // "resetting state when a prop changes" (avoids an extra render pass).
  const [trackedPhotoSrc, setTrackedPhotoSrc] = useState(photoSrc);
  if (photoSrc !== trackedPhotoSrc) {
    setTrackedPhotoSrc(photoSrc);
    setPhotoFailed(false);
  }

  // Only legible at larger render sizes — at sm/md (32-56px real pixels) a
  // two-letter label would be an illegible smudge, so it's skipped there
  // rather than shown badly.
  const showAiBadge = size === "lg" || size === "xl";

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
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="49" />
        </clipPath>
      </defs>

      <circle cx="50" cy="50" r="49" fill={`url(#${gradientId})`} />

      {/* Abstract fallback — always rendered underneath, visible while the
          photo loads and as the true fallback if it fails, per the design
          principle that this must never show a broken-image icon. */}
      <g transform={`rotate(${skew} 50 50)`} fill="rgba(255,255,255,0.92)">
        <path d="M18 100 C18 74 32 54 50 54 C68 54 82 74 82 100 Z" />
        {identity.gender === "female" && (
          <path d="M50 20 C36 20 26 32 26 46 C26 54 28 62 32 68 L36 68 C33 60 32 52 32 46 C32 34 40 26 50 26 C60 26 68 34 68 46 C68 52 67 60 64 68 L68 68 C72 62 74 54 74 46 C74 32 64 20 50 20 Z" />
        )}
        <circle cx="50" cy="40" r="18" />
      </g>

      {/* Real headshot — the primary visual, drawn over the abstract
          fallback so a slow load never shows blank space, and simply never
          rendered (not left as a broken-image icon) if it fails. */}
      {!photoFailed && (
        <image
          href={photoSrc}
          x="0"
          y="0"
          width="100"
          height="100"
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          onError={() => setPhotoFailed(true)}
        />
      )}

      {/* Drawn after the photo (unlike the abstract avatar, a headshot
          fills the whole disc with no gaps for the ring to peek through)
          so the ring stays visible on top exactly as it did before. */}
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

      {showAiBadge && (
        <g aria-hidden>
          <circle cx="79" cy="79" r="12" fill="#18181b" stroke="#fafafa" strokeWidth="2" />
          <text
            x="79"
            y="83"
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="#fafafa"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            AI
          </text>
        </g>
      )}
    </svg>
  );
}

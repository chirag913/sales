import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

/** Animates a number from 0 to `target` while `active`. Jumps straight to
 * the final value under prefers-reduced-motion. */
export function useCountUp(target: number, active: boolean, durationMs = 900) {
  const [value, setValue] = useState(0);
  const reducedMotion = useReducedMotion();
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!active || reducedMotion) return;

    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [active, target, durationMs, reducedMotion]);

  if (reducedMotion) return active ? target : 0;

  return value;
}

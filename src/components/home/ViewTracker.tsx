"use client";

import { useEffect, useRef } from "react";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";

// Reports an analytics event once, the first time this spot scrolls into
// view. Renders an empty, zero-height marker: no layout, no visual.
export function ViewTracker({ event }: { event: AnalyticsEvent }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          trackEvent(event);
          observer.disconnect();
        }
      },
      { threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [event]);

  return <div ref={ref} aria-hidden />;
}

"use client";

import Link from "next/link";
import { ComponentProps } from "react";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";

type TrackedLinkProps = ComponentProps<typeof Link> & { event: AnalyticsEvent; eventProps?: Record<string, string> };

// A normal <Link> that also reports one analytics event when clicked.
export function TrackedLink({ event, eventProps, onClick, ...props }: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        trackEvent(event, eventProps);
        onClick?.(e);
      }}
    />
  );
}

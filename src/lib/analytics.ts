// Deliberately tiny. The project has no analytics provider yet, so this only
// gives every important interaction ONE call site and ONE place to connect a
// provider later. Events are dispatched as a DOM CustomEvent
// ("bettercallz:analytics"); to send them somewhere (GA4, PostHog, Plausible,
// a server endpoint...) add a single listener, e.g. in a client layout:
//
//   window.addEventListener("bettercallz:analytics", (e) => {
//     const { name, props } = (e as CustomEvent).detail;
//     posthog.capture(name, props);
//   });
//
// Nothing is sent anywhere today. No cookies, no third-party scripts.

export type AnalyticsEvent =
  | "landing_view"
  | "instant_calling_view"
  | "lead_recovery_view"
  | "custom_demo_form_started"
  | "custom_demo_requested"
  | "talk_to_team_requested"
  | "outbound_clicked";

export function trackEvent(name: AnalyticsEvent, props?: Record<string, string | number | boolean>): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("bettercallz:analytics", { detail: { name, props } }));
  if (process.env.NODE_ENV !== "production") console.debug("[analytics]", name, props ?? {});
}

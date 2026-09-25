import { ComponentProps } from "react";
import { TrackedLink } from "@/components/home/TrackedLink";

// The site's only two conversion actions. Try Demo goes straight to the live
// demo product (a separate site); Talk to Us goes to the lead form on the home
// page, which is the site's contact point (there is no separate contact route).
export const DEMO_URL = "https://demo.bettercallz.com/";
export const CONTACT_HREF = "/#get-started";

type CtaProps = Omit<ComponentProps<typeof TrackedLink>, "href" | "event" | "eventProps"> & { from: string };

export function TryDemoLink({ from, children = "Try Demo →", ...props }: CtaProps) {
  return (
    <TrackedLink href={DEMO_URL} event="try_demo_click" eventProps={{ from }} {...props}>
      {children}
    </TrackedLink>
  );
}

export function TalkToUsLink({ from, children = "Talk to Us →", ...props }: CtaProps) {
  return (
    <TrackedLink href={CONTACT_HREF} event="talk_to_us_click" eventProps={{ from }} {...props}>
      {children}
    </TrackedLink>
  );
}

import type { Metadata } from "next";
import { CallJourney } from "@/components/landing/CallJourney";
import { CoachHighlight } from "@/components/landing/CoachHighlight";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { IcpPreview } from "@/components/landing/IcpPreview";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { Pricing } from "@/components/landing/Pricing";
import { WhoItsFor } from "@/components/landing/WhoItsFor";

export const metadata: Metadata = {
  title: { absolute: "BetterCallz Outbound — Your reps shouldn't learn on your prospects" },
  description:
    "Practice realistic sales conversations with AI prospects before your team makes the real call. For Indian BPOs, appointment-setting teams and agencies selling to the US, UK, Canada and Australia.",
  alternates: { canonical: "/outbound" },
  openGraph: {
    title: "BetterCallz Outbound — Your reps shouldn't learn on your prospects",
    description:
      "Practice realistic sales conversations with AI prospects before your team makes the real call.",
    url: "/outbound",
    type: "website",
  },
};

// The existing sales-practice product's landing page, unchanged apart from its
// positioning copy (Hero) and its logo now linking to the BetterCallz home.
export default function OutboundPage() {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <Hero />
      <CallJourney />
      <CoachHighlight />
      <IcpPreview />
      <WhoItsFor />
      <HowItWorks />
      <Pricing />
      <LandingFooter />
    </div>
  );
}

import type { Metadata } from "next";
import { HomeNav } from "@/components/home/HomeNav";
import { ViewTracker } from "@/components/home/ViewTracker";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { PricingCards } from "@/components/pricing/PricingCards";
import { PricingFactors } from "@/components/pricing/PricingFactors";
import { PricingFaq } from "@/components/pricing/PricingFaq";
import { PricingFinalCta } from "@/components/pricing/PricingFinalCta";
import { PricingFlow } from "@/components/pricing/PricingFlow";
import { PricingHero } from "@/components/pricing/PricingHero";
import { PricingWorkflow } from "@/components/pricing/PricingWorkflow";

const TITLE = "BetterCallz Pricing — AI Calling for Your Sales Leads";
const DESCRIPTION =
  "See BetterCallz pricing for AI lead calling, qualification and sales handoff. Plans start at ₹19,999/month, with custom pricing for high-volume teams.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/pricing",
    siteName: "BetterCallz",
    type: "website",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// Pricing for the Lead-to-Speed product only (new-lead calling and
// qualification). Bulk Outbound has its own pricing on /outbound and is
// deliberately not shown here. All CTAs route to the existing lead-capture
// form at /#get-started — this app has no separate Contact Us route.
export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <HomeNav />
      <main>
        <ViewTracker event="pricing_view" />
        <PricingHero />
        <PricingCards />
        <PricingFactors />
        <PricingFlow />
        <PricingWorkflow />
        <PricingFaq />
        <PricingFinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}

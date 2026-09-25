import type { Metadata } from "next";
import { Differentiation } from "@/components/home/Differentiation";
import { FounderLine } from "@/components/home/FounderSignature";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeNav } from "@/components/home/HomeNav";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Industries } from "@/components/home/Industries";
import { InstantCalling } from "@/components/home/InstantCalling";
import { Integrations } from "@/components/home/Integrations";
import { LeadCapture } from "@/components/home/LeadCapture";
import { LeadGap } from "@/components/home/LeadGap";
import { LeadRecovery } from "@/components/home/LeadRecovery";
import { LiveDemo } from "@/components/home/LiveDemo";
import { OutboundCallout } from "@/components/home/OutboundCallout";
import { PositioningStatement } from "@/components/home/PositioningStatement";
import { PricingPreview } from "@/components/home/PricingPreview";
import { ProductCards } from "@/components/home/ProductCards";
import { RealEstate } from "@/components/home/RealEstate";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { PricingFinalCta } from "@/components/pricing/PricingFinalCta";

const TITLE = "BetterCallz — You Already Paid for the Lead";
const DESCRIPTION =
  "Every lead costs money to acquire. BetterCallz calls new and existing leads, has the first conversation, qualifies their interest, and gives your sales team the people worth following up with.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "BetterCallz",
    type: "website",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// The BetterCallz home: lead response for Indian businesses selling to Indian
// customers (instant lead calling and lead recovery). The sales-practice
// product for teams selling abroad lives at /outbound.
export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HomeNav />
      <main>
        <HomeHero />
        <Differentiation />
        <ProductCards />
        <LeadGap />
        <HowItWorks />
        <InstantCalling />
        <LeadRecovery />
        <RealEstate />
        <Industries />
        <Integrations />
        <PositioningStatement />
        <LiveDemo />
        <PricingPreview />
        {/* #get-started: the lead form every "Talk to Us" CTA points at. */}
        <LeadCapture />
        <FounderLine />
        <PricingFinalCta from="home_final" />
        <OutboundCallout />
      </main>
      <LandingFooter />
    </div>
  );
}

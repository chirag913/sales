import type { Metadata } from "next";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeNav } from "@/components/home/HomeNav";
import { Industries } from "@/components/home/Industries";
import { InstantCalling } from "@/components/home/InstantCalling";
import { LeadCapture } from "@/components/home/LeadCapture";
import { LeadGap } from "@/components/home/LeadGap";
import { LeadRecovery } from "@/components/home/LeadRecovery";
import { OutboundCallout } from "@/components/home/OutboundCallout";
import { ProductCards } from "@/components/home/ProductCards";
import { RealEstate } from "@/components/home/RealEstate";
import { LandingFooter } from "@/components/landing/LandingFooter";

const TITLE = "BetterCallz — Turn Every Lead Into a Conversation";
const DESCRIPTION =
  "AI voice agents for businesses that want to respond to new leads faster and recover the leads they've already paid for.";

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
        <ProductCards />
        <LeadGap />
        <InstantCalling />
        <LeadRecovery />
        <RealEstate />
        <Industries />
        <LeadCapture />
        <OutboundCallout />
      </main>
      <LandingFooter />
    </div>
  );
}

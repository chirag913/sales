import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { IcpPreview } from "@/components/landing/IcpPreview";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { Pricing } from "@/components/landing/Pricing";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { WhoItsFor } from "@/components/landing/WhoItsFor";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <Hero />
      <TrustStrip />
      <WhoItsFor />
      <IcpPreview />
      <HowItWorks />
      <Pricing />
      <LandingFooter />
    </div>
  );
}

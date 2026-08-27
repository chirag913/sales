import { CallJourney } from "@/components/landing/CallJourney";
import { CoachHighlight } from "@/components/landing/CoachHighlight";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { IcpPreview } from "@/components/landing/IcpPreview";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { Pricing } from "@/components/landing/Pricing";
import { WhoItsFor } from "@/components/landing/WhoItsFor";

export default function LandingPage() {
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

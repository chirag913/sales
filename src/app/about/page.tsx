import type { Metadata } from "next";
import { FounderSignature } from "@/components/home/FounderSignature";
import { WhatsAppButton } from "@/components/home/WhatsAppButton";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { HomeNav } from "@/components/home/HomeNav";

const TITLE = "About — BetterCallz";
const DESCRIPTION = "Why BetterCallz exists: businesses don't need more leads, they need more conversations with the ones they have.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/about", siteName: "BetterCallz", type: "website", locale: "en_IN" },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <HomeNav />
      <main className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-teal-700 dark:text-teal-400">About</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          Every sale starts with a conversation.
        </h1>

        <div className="mt-10 space-y-5 text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">
          <p>
            I&apos;m Chirag Sharma, founder of BetterCallz. I&apos;ve spent years experimenting with different
            businesses, from products and services to software.
          </p>
          <p>The businesses were different. What I kept seeing was the same: before you can sell anything, you need to understand the person you&apos;re selling to.</p>
          <p>
            Are they interested? Do they have the problem you solve? Are they a fit? Are they ready to move forward?
          </p>
          <p>
            That&apos;s the qualification stage. Across every business, it kept showing up in a different form: sales
            calls, forms, WhatsApp conversations, enquiries, consultations.
          </p>
          <p>
            Meanwhile, businesses got very good at generating leads. Ads generate them. Forms capture them. CRMs store
            them. Automations notify the team.
          </p>
          <p>
            But the conversation can still get missed. A salesperson gets busy. The lead doesn&apos;t answer. Someone
            forgets to follow up. A promising enquiry gets buried.
          </p>
          <p>That, seen over and over, is what led to BetterCallz.</p>
          <p>
            The idea is simple: let AI handle the first conversation, and let your sales team handle the opportunities.
            BetterCallz calls leads, understands what they&apos;re looking for, qualifies them, and gives your sales team
            useful context.
          </p>
          <p>
            I don&apos;t think businesses necessarily need more leads. I think they need to get more value from the leads
            they already have.
          </p>
        </div>

        <div className="mt-14">
          <FounderSignature />
        </div>
      </main>
      <LandingFooter />
      <WhatsAppButton />
    </div>
  );
}

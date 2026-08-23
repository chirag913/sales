"use client";

import { FormEvent, useEffect, useState } from "react";
import { FormField } from "@/components/ui/FormField";
import { FormSection } from "@/components/ui/FormSection";
import { Button } from "@/components/ui/Button";
import { loadSalesProfile, saveSalesProfile } from "@/lib/storage/localProfile";
import { emptySalesProfile, SalesProfile, SALES_OBJECTIVE_OPTIONS } from "@/lib/types";

type ObjectSectionKey = "company" | "offer" | "targetCustomer" | "proof" | "importantInfo";

export function ProfileForm() {
  const [profile, setProfile] = useState<SalesProfile>(emptySalesProfile());
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    const existing = loadSalesProfile();
    if (existing) setProfile(existing);
    setLoaded(true);
  }, []);

  function update<K extends ObjectSectionKey>(section: K, field: keyof SalesProfile[K], value: string) {
    setSavedAt(null);
    setProfile((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    saveSalesProfile(profile);
    setSavedAt(Date.now());
  }

  if (!loaded) return null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FormSection title="Company">
        <FormField label="Company name" value={profile.company.name} onChange={(v) => update("company", "name", v)} />
        <FormField
          label="Company location"
          value={profile.company.location}
          onChange={(v) => update("company", "location", v)}
          placeholder="e.g. Mumbai, India"
        />
        <FormField label="Website" value={profile.company.website} onChange={(v) => update("company", "website", v)} />
        <FormField
          label="Years operating"
          value={profile.company.yearsOperating}
          onChange={(v) => update("company", "yearsOperating", v)}
        />
        <FormField label="Team size" value={profile.company.teamSize} onChange={(v) => update("company", "teamSize", v)} />
      </FormSection>

      <FormSection title="Offer">
        <FormField
          label="What do I sell?"
          value={profile.offer.whatYouSell}
          onChange={(v) => update("offer", "whatYouSell", v)}
          type="textarea"
        />
        <FormField
          label="What problem does it solve?"
          value={profile.offer.problemSolved}
          onChange={(v) => update("offer", "problemSolved", v)}
          type="textarea"
        />
        <FormField label="Price" value={profile.offer.price} onChange={(v) => update("offer", "price", v)} />
        <FormField
          label="Pricing model"
          value={profile.offer.pricingModel}
          onChange={(v) => update("offer", "pricingModel", v)}
          placeholder="e.g. monthly retainer, one-time"
        />
        <FormField
          label="Main outcome"
          value={profile.offer.mainOutcome}
          onChange={(v) => update("offer", "mainOutcome", v)}
        />
        <FormField
          label="Unique selling proposition"
          value={profile.offer.usp}
          onChange={(v) => update("offer", "usp", v)}
          type="textarea"
        />
      </FormSection>

      <FormSection title="Target customer">
        <FormField
          label="Industry"
          value={profile.targetCustomer.industry}
          onChange={(v) => update("targetCustomer", "industry", v)}
        />
        <FormField
          label="Company size"
          value={profile.targetCustomer.companySize}
          onChange={(v) => update("targetCustomer", "companySize", v)}
        />
        <FormField
          label="Job title"
          value={profile.targetCustomer.jobTitle}
          onChange={(v) => update("targetCustomer", "jobTitle", v)}
        />
        <FormField
          label="Country"
          value={profile.targetCustomer.country}
          onChange={(v) => update("targetCustomer", "country", v)}
          placeholder="United States"
        />
        <FormField
          label="Typical prospect"
          value={profile.targetCustomer.typicalProspect}
          onChange={(v) => update("targetCustomer", "typicalProspect", v)}
          type="textarea"
        />
      </FormSection>

      <FormSection
        title="Proof"
        description="Never invent this — the prospect agent will only use what's entered here."
      >
        <FormField label="US clients" value={profile.proof.usClients} onChange={(v) => update("proof", "usClients", v)} />
        <FormField
          label="Number of clients"
          value={profile.proof.numberOfClients}
          onChange={(v) => update("proof", "numberOfClients", v)}
        />
        <FormField
          label="Case studies"
          value={profile.proof.caseStudies}
          onChange={(v) => update("proof", "caseStudies", v)}
          type="textarea"
        />
        <FormField label="Results" value={profile.proof.results} onChange={(v) => update("proof", "results", v)} type="textarea" />
        <FormField
          label="Testimonials"
          value={profile.proof.testimonials}
          onChange={(v) => update("proof", "testimonials", v)}
          type="textarea"
        />
        <FormField label="Guarantees" value={profile.proof.guarantees} onChange={(v) => update("proof", "guarantees", v)} />
        <FormField
          label="Other credibility"
          value={profile.proof.otherCredibility}
          onChange={(v) => update("proof", "otherCredibility", v)}
          type="textarea"
        />
      </FormSection>

      <FormSection title="Sales objective">
        <FormField
          label="What's the goal of the call?"
          value={profile.salesObjective}
          onChange={(v) => {
            setSavedAt(null);
            setProfile((prev) => ({ ...prev, salesObjective: v as SalesProfile["salesObjective"] }));
          }}
          type="select"
          options={SALES_OBJECTIVE_OPTIONS}
        />
      </FormSection>

      <FormSection
        title="Important information"
        description='US prospects will ask "Where are you based?" or "Do you have a US office?" — the prospect agent only knows what you enter here, and will never invent an answer.'
      >
        <FormField
          label="Where the company is based"
          value={profile.importantInfo.companyBasedIn}
          onChange={(v) => update("importantInfo", "companyBasedIn", v)}
        />
        <FormField
          label="Is there a US office?"
          value={profile.importantInfo.hasUSOffice}
          onChange={(v) => update("importantInfo", "hasUSOffice", v)}
          placeholder="e.g. No / Yes, in Austin, TX"
        />
        <FormField
          label="Where the team is located"
          value={profile.importantInfo.teamLocation}
          onChange={(v) => update("importantInfo", "teamLocation", v)}
        />
        <FormField
          label="How the service is delivered"
          value={profile.importantInfo.deliveryMethod}
          onChange={(v) => update("importantInfo", "deliveryMethod", v)}
        />
        <FormField
          label="Working hours / time zones"
          value={profile.importantInfo.workingHours}
          onChange={(v) => update("importantInfo", "workingHours", v)}
        />
        <FormField
          label="Communication method"
          value={profile.importantInfo.communicationMethod}
          onChange={(v) => update("importantInfo", "communicationMethod", v)}
          placeholder="e.g. Email, Slack, Zoom"
        />
      </FormSection>

      <div className="flex items-center gap-4">
        <Button type="submit">Save profile</Button>
        {savedAt && <span className="text-sm text-zinc-500 dark:text-zinc-400">Saved</span>}
      </div>
    </form>
  );
}

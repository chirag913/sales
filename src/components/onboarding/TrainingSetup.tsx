"use client";

import { useEffect, useState } from "react";
import { HeroInput, HeroInputValue } from "@/components/onboarding/HeroInput";
import { ProfileReview } from "@/components/onboarding/ProfileReview";
import { loadSalesProfile, saveSalesProfile } from "@/lib/storage/localProfile";
import { clearTrainingProfile, loadTrainingProfile, saveTrainingProfile } from "@/lib/storage/localTrainingProfile";
import { applyTrainingProfileToSalesProfile } from "@/lib/profile/sync";
import { emptySalesProfile, TrainingProfile } from "@/lib/types";

type Step = "input" | "review";

export function TrainingSetup() {
  const [step, setStep] = useState<Step>("input");
  const [profile, setProfile] = useState<TrainingProfile | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const existing = loadTrainingProfile();
    if (existing) {
      setProfile(existing);
      setStep("review");
    }
    setLoaded(true);
  }, []);

  async function handleGenerate(input: HeroInputValue) {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/profile/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to generate training profile.");
      }
      const generated: TrainingProfile = await res.json();
      setProfile(generated);
      saveTrainingProfile(generated);
      const existingSales = loadSalesProfile() ?? emptySalesProfile();
      saveSalesProfile(applyTrainingProfileToSalesProfile(generated, existingSales));
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  function handleStartOver() {
    clearTrainingProfile();
    setProfile(null);
    setError(null);
    setStep("input");
  }

  if (!loaded) return null;

  if (step === "review" && profile) {
    return <ProfileReview profile={profile} onStartOver={handleStartOver} />;
  }

  return <HeroInput onSubmit={handleGenerate} loading={generating} error={error} />;
}

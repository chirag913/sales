"use client";

import { useEffect, useState } from "react";
import { CallScreen } from "@/components/call/CallScreen";
import { HeroInput, HeroInputValue } from "@/components/onboarding/HeroInput";
import { ProfileReview } from "@/components/onboarding/ProfileReview";
import { ReadyToCall } from "@/components/onboarding/ReadyToCall";
import { ScenarioPicker } from "@/components/onboarding/ScenarioPicker";
import { loadSalesProfile, saveSalesProfile } from "@/lib/storage/localProfile";
import {
  clearTrainingProfile,
  loadScenarios,
  loadTrainingProfile,
  saveScenarios,
  saveTrainingProfile,
} from "@/lib/storage/localTrainingProfile";
import { applyTrainingProfileToSalesProfile } from "@/lib/profile/sync";
import { generateProspectIdentity } from "@/lib/prospect/identity";
import { emptySalesProfile, ProspectIdentity, Scenario, TrainingProfile } from "@/lib/types";

type Step = "input" | "review" | "scenarios" | "ready" | "call";

export function TrainingSetup() {
  const [step, setStep] = useState<Step>("input");
  const [profile, setProfile] = useState<TrainingProfile | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[] | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [prospectIdentity, setProspectIdentity] = useState<ProspectIdentity | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingScenarios, setGeneratingScenarios] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const existingProfile = loadTrainingProfile();
    if (existingProfile) {
      setProfile(existingProfile);
      const existingScenarios = loadScenarios();
      if (existingScenarios && existingScenarios.length > 0) {
        setScenarios(existingScenarios);
        setStep("scenarios");
      } else {
        setStep("review");
      }
    }
    setLoaded(true);
  }, []);

  function persistProfile(next: TrainingProfile) {
    setProfile(next);
    saveTrainingProfile(next);
    const existingSales = loadSalesProfile() ?? emptySalesProfile();
    saveSalesProfile(applyTrainingProfileToSalesProfile(next, existingSales));
  }

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
      persistProfile(generated);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleConfirmProfile() {
    if (!profile) return;
    setScenarioError(null);
    setGeneratingScenarios(true);
    try {
      const res = await fetch("/api/scenarios/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to generate scenarios.");
      }
      const generated: Scenario[] = await res.json();
      setScenarios(generated);
      saveScenarios(generated);
      setStep("scenarios");
    } catch (err) {
      setScenarioError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGeneratingScenarios(false);
    }
  }

  function handleSelectScenario(scenario: Scenario) {
    setSelectedScenario(scenario);
    if (profile) {
      setProspectIdentity(generateProspectIdentity(profile.market, profile.icpTitles));
    }
    setStep("ready");
  }

  function handleBackToScenarios() {
    setSelectedScenario(null);
    setProspectIdentity(null);
    setStep("scenarios");
  }

  function handleEndCall() {
    setSelectedScenario(null);
    setProspectIdentity(null);
    setStep("scenarios");
  }

  function handleStartOver() {
    clearTrainingProfile();
    setProfile(null);
    setScenarios(null);
    setSelectedScenario(null);
    setProspectIdentity(null);
    setError(null);
    setScenarioError(null);
    setStep("input");
  }

  if (!loaded) return null;

  if (step === "call" && profile && selectedScenario && prospectIdentity) {
    return (
      <CallScreen
        salesProfile={loadSalesProfile() ?? emptySalesProfile()}
        trainingProfile={profile}
        scenario={selectedScenario}
        identity={prospectIdentity}
        onEnd={handleEndCall}
      />
    );
  }

  if (step === "ready" && profile && selectedScenario && prospectIdentity) {
    return (
      <ReadyToCall
        profile={profile}
        scenario={selectedScenario}
        identity={prospectIdentity}
        onBack={handleBackToScenarios}
        onStartCall={() => setStep("call")}
      />
    );
  }

  if (step === "scenarios" && profile && scenarios) {
    return <ScenarioPicker scenarios={scenarios} onSelect={handleSelectScenario} onBack={() => setStep("review")} />;
  }

  if (step === "review" && profile) {
    return (
      <ProfileReview
        profile={profile}
        onChange={persistProfile}
        onStartOver={handleStartOver}
        onConfirm={handleConfirmProfile}
        confirming={generatingScenarios}
        confirmError={scenarioError}
      />
    );
  }

  return <HeroInput onSubmit={handleGenerate} loading={generating} error={error} />;
}

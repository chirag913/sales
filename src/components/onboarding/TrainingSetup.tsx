"use client";

import { useEffect, useMemo, useState } from "react";
import { CallScreen } from "@/components/call/CallScreen";
import { ScoreScreen } from "@/components/call/ScoreScreen";
import { HeroInput, HeroInputValue } from "@/components/onboarding/HeroInput";
import { ProfileReview } from "@/components/onboarding/ProfileReview";
import { ReadyToCall } from "@/components/onboarding/ReadyToCall";
import { ScenarioPicker } from "@/components/onboarding/ScenarioPicker";
import { migrateLocalDataIfNeeded } from "@/lib/profile/migrateLocalData";
import { applyTrainingProfileToSalesProfile } from "@/lib/profile/sync";
import { generateProspectIdentity, ProspectGenderPreference } from "@/lib/prospect/identity";
import { createClient } from "@/lib/supabase/client";
import {
  clearRemoteTrainingProfile,
  loadRemoteProfileRow,
  saveRemoteSalesProfile,
  saveRemoteScenarios,
  saveRemoteTrainingProfile,
} from "@/lib/storage/supabaseProfile";
import {
  CallScoreResult,
  emptySalesProfile,
  ProspectIdentity,
  SalesProfile,
  Scenario,
  TranscriptEntry,
  TrainingProfile,
} from "@/lib/types";

type Step = "input" | "review" | "scenarios" | "ready" | "call" | "scoring";

export function TrainingSetup() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("input");
  const [profile, setProfile] = useState<TrainingProfile | null>(null);
  const [salesProfile, setSalesProfile] = useState<SalesProfile>(emptySalesProfile());
  const [scenarios, setScenarios] = useState<Scenario[] | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [prospectIdentity, setProspectIdentity] = useState<ProspectIdentity | null>(null);
  const [voicePreference, setVoicePreference] = useState<ProspectGenderPreference>("any");
  const [generating, setGenerating] = useState(false);
  const [generatingScenarios, setGeneratingScenarios] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [scoreResult, setScoreResult] = useState<CallScoreResult | null>(null);
  const [callTranscript, setCallTranscript] = useState<TranscriptEntry[] | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoringError, setScoringError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoaded(true);
        return;
      }

      await migrateLocalDataIfNeeded(supabase, user.id);
      const remote = await loadRemoteProfileRow(supabase, user.id);
      if (cancelled) return;

      setUserId(user.id);
      if (remote?.salesProfile) setSalesProfile(remote.salesProfile);
      if (remote?.trainingProfile) {
        setProfile(remote.trainingProfile);
        if (remote.scenarios && remote.scenarios.length > 0) {
          setScenarios(remote.scenarios);
          setStep("scenarios");
        } else {
          setStep("review");
        }
      }
      setLoaded(true);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function persistProfile(next: TrainingProfile) {
    setProfile(next);
    if (!userId) return;
    void saveRemoteTrainingProfile(supabase, userId, next);
    const nextSales = applyTrainingProfileToSalesProfile(next, salesProfile);
    setSalesProfile(nextSales);
    void saveRemoteSalesProfile(supabase, userId, nextSales);
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
      void persistProfile(generated);
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
      if (userId) void saveRemoteScenarios(supabase, userId, generated);
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
      setProspectIdentity(generateProspectIdentity(profile.market, profile.icpTitles, profile.service, voicePreference));
    }
    setStep("ready");
  }

  function handleBackToScenarios() {
    setSelectedScenario(null);
    setProspectIdentity(null);
    setStep("scenarios");
  }

  async function runScoring(transcript: TranscriptEntry[], durationSeconds: number, scenario: Scenario, trainingProfile: TrainingProfile) {
    setScoring(true);
    setScoringError(null);
    setScoreResult(null);
    try {
      const res = await fetch("/api/score/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          salesProfile,
          trainingProfile,
          scenario,
          durationSeconds,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to score the call.");
      }
      const result: CallScoreResult = await res.json();
      setScoreResult(result);

      if (prospectIdentity) {
        void fetch("/api/calls/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenario,
            identity: prospectIdentity,
            durationSeconds,
            result,
            transcript,
          }),
        }).catch(() => {
          // Call storage is a non-critical enhancement — fail silently, same as coaching.
        });
      }
    } catch (err) {
      setScoringError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setScoring(false);
    }
  }

  function handleCallEnded(transcript: TranscriptEntry[], durationSeconds: number) {
    if (!profile || !selectedScenario) return;
    setCallDurationSeconds(durationSeconds);
    setCallTranscript(transcript);
    setStep("scoring");
    void runScoring(transcript, durationSeconds, selectedScenario, profile);
  }

  function handlePracticeAgain() {
    if (!profile || !selectedScenario) return;
    setProspectIdentity(generateProspectIdentity(profile.market, profile.icpTitles, profile.service, voicePreference));
    setScoreResult(null);
    setScoringError(null);
    setCallTranscript(null);
    setStep("call");
  }

  function handleScoreDone() {
    setSelectedScenario(null);
    setProspectIdentity(null);
    setScoreResult(null);
    setScoringError(null);
    setCallTranscript(null);
    setStep("scenarios");
  }

  function handleStartOver() {
    if (userId) void clearRemoteTrainingProfile(supabase, userId);
    setProfile(null);
    setScenarios(null);
    setSelectedScenario(null);
    setProspectIdentity(null);
    setScoreResult(null);
    setScoringError(null);
    setError(null);
    setScenarioError(null);
    setStep("input");
  }

  if (!loaded) return null;

  if (step === "scoring" && selectedScenario) {
    return (
      <ScoreScreen
        scenario={selectedScenario}
        durationSeconds={callDurationSeconds}
        result={scoreResult}
        loading={scoring}
        error={scoringError}
        transcript={callTranscript}
        onPracticeAgain={handlePracticeAgain}
        onDone={handleScoreDone}
      />
    );
  }

  if (step === "call" && profile && selectedScenario && prospectIdentity) {
    return (
      <CallScreen
        salesProfile={salesProfile}
        trainingProfile={profile}
        scenario={selectedScenario}
        identity={prospectIdentity}
        onEnd={handleCallEnded}
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
    return (
      <ScenarioPicker
        scenarios={scenarios}
        onSelect={handleSelectScenario}
        onBack={() => setStep("review")}
        voicePreference={voicePreference}
        onVoicePreferenceChange={setVoicePreference}
      />
    );
  }

  if (step === "review" && profile) {
    return (
      <ProfileReview
        profile={profile}
        onChange={(next) => void persistProfile(next)}
        onStartOver={handleStartOver}
        onConfirm={handleConfirmProfile}
        confirming={generatingScenarios}
        confirmError={scenarioError}
      />
    );
  }

  return <HeroInput onSubmit={handleGenerate} loading={generating} error={error} />;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { CallScreen, CallEndInfo } from "@/components/call/CallScreen";
import { ScoreScreen } from "@/components/call/ScoreScreen";
import { HeroInput, HeroInputValue } from "@/components/onboarding/HeroInput";
import { Paywall } from "@/components/onboarding/Paywall";
import { ProfileReview } from "@/components/onboarding/ProfileReview";
import { ReadyToCall } from "@/components/onboarding/ReadyToCall";
import { ScenarioPicker } from "@/components/onboarding/ScenarioPicker";
import { EntitlementStatus } from "@/lib/entitlement/types";
import { migrateLocalDataIfNeeded } from "@/lib/profile/migrateLocalData";
import { normalizeTrainingProfile } from "@/lib/profile/normalize";
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

interface FinishedCall {
  transcript: TranscriptEntry[];
  durationSeconds: number;
  callId: string;
  info: CallEndInfo;
  scenario: Scenario;
  identity: ProspectIdentity;
  trainingProfile: TrainingProfile;
}

type Step = "input" | "review" | "scenarios" | "ready" | "call" | "scoring" | "paywall";

export function TrainingSetup() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("input");
  const [stepBeforePaywall, setStepBeforePaywall] = useState<Step>("scenarios");
  const [profile, setProfile] = useState<TrainingProfile | null>(null);
  const [salesProfile, setSalesProfile] = useState<SalesProfile>(emptySalesProfile());
  const [scenarios, setScenarios] = useState<Scenario[] | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [prospectIdentity, setProspectIdentity] = useState<ProspectIdentity | null>(null);
  const [voicePreference, setVoicePreference] = useState<ProspectGenderPreference>("any");
  const [entitlement, setEntitlement] = useState<EntitlementStatus | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingScenarios, setGeneratingScenarios] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [scoreResult, setScoreResult] = useState<CallScoreResult | null>(null);
  const [callTranscript, setCallTranscript] = useState<TranscriptEntry[] | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoringError, setScoringError] = useState<string | null>(null);
  // Everything needed to score or save the finished call again without
  // spending another call: kept until the user leaves the score screen.
  const [finishedCall, setFinishedCall] = useState<FinishedCall | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  // "Work on this next" from the last score, shown on the Ready screen for a retry.
  const [retryFocus, setRetryFocus] = useState<string[]>([]);
  const [scoreProgress, setScoreProgress] = useState<{
    previousBestScore?: number;
    previousScore?: number;
    callNumber?: number;
  }>({});
  const [loaded, setLoaded] = useState(false);

  // A scenario and its prospect are one unit: the identity is generated from
  // the scenario's own role/industry when the batch is created, stored ON the
  // scenario (and persisted with it), and read from there everywhere — the
  // picker card, Ready, the live call and the score screen. It only changes
  // on an explicit "fresh prospect" or a voice-preference change, never as a
  // side effect of a re-render, a reload or a retry.
  const identities = useMemo(() => {
    const map = new Map<string, ProspectIdentity>();
    for (const scenario of scenarios ?? []) {
      if (scenario.identity) map.set(scenario.id, scenario.identity);
    }
    return map;
  }, [scenarios]);

  function newIdentityFor(scenario: Scenario, trainingProfile: TrainingProfile, preference: ProspectGenderPreference) {
    return generateProspectIdentity({ market: trainingProfile.market, profile: trainingProfile, scenario, genderPreference: preference });
  }

  function withIdentities(batch: Scenario[], trainingProfile: TrainingProfile, preference: ProspectGenderPreference): Scenario[] {
    return batch.map((scenario) => ({ ...scenario, identity: newIdentityFor(scenario, trainingProfile, preference) }));
  }

  function replaceScenarios(next: Scenario[]) {
    setScenarios(next);
    if (userId) void saveRemoteScenarios(supabase, userId, next);
  }

  function handleVoicePreferenceChange(preference: ProspectGenderPreference) {
    setVoicePreference(preference);
    if (!profile || !scenarios) return;
    // Explicit user action: re-roll everyone to match the requested voice.
    replaceScenarios(withIdentities(scenarios, profile, preference));
  }

  async function refreshEntitlement(): Promise<EntitlementStatus | null> {
    try {
      const res = await fetch("/api/entitlement/status");
      if (!res.ok) return null;
      const status: EntitlementStatus = await res.json();
      setEntitlement(status);
      return status;
    } catch {
      return null;
    }
  }

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
        const loadedProfile = normalizeTrainingProfile(remote.trainingProfile);
        setProfile(loadedProfile);
        // Scenarios saved before scenarios carried a role/situation (or before
        // the prospect industry existed) can't drive a consistent prospect, so
        // send the user back to the review step to regenerate them rather than
        // running a call against a half-specified persona.
        const usableScenarios = (remote.scenarios ?? []).filter((scenario) => Boolean(scenario.prospectRole && scenario.situation));
        if (usableScenarios.length > 0 && loadedProfile.prospectIndustry) {
          const ready = usableScenarios.map((scenario) =>
            scenario.identity ? scenario : { ...scenario, identity: newIdentityFor(scenario, loadedProfile, "any") }
          );
          setScenarios(ready);
          if (ready.some((scenario, i) => scenario !== usableScenarios[i])) void saveRemoteScenarios(supabase, user.id, ready);
          setStep("scenarios");
        } else {
          setStep("review");
        }
      }
      void refreshEntitlement();
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
    if (!profile.prospectIndustry.trim()) {
      setScenarioError("Add the industry you're calling (e.g. dental practices) so the prospects make sense.");
      return;
    }
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
      replaceScenarios(withIdentities(generated, profile, voicePreference));
      setStep("scenarios");
    } catch (err) {
      setScenarioError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGeneratingScenarios(false);
    }
  }

  async function handleSelectScenario(scenario: Scenario) {
    const current = (await refreshEntitlement()) ?? entitlement;
    if (current && !current.canStartCall) {
      setStepBeforePaywall("scenarios");
      setStep("paywall");
      return;
    }
    setSelectedScenario(scenario);
    let identity = scenario.identity;
    if (!identity && profile) {
      // Defensive only: every scenario gets an identity when it's created or loaded.
      identity = newIdentityFor(scenario, profile, voicePreference);
      replaceScenarios((scenarios ?? []).map((s) => (s.id === scenario.id ? { ...s, identity } : s)));
    }
    setProspectIdentity(identity ?? null);
    setStep("ready");
  }

  function handleBackToScenarios() {
    setRetryFocus([]);
    setSelectedScenario(null);
    setProspectIdentity(null);
    setStep("scenarios");
  }

  // Persisting the call is critical (it's the user's history and what
  // finalizes the call session), so it is awaited and its failure is shown
  // with a retry, never swallowed.
  async function saveCall(call: FinishedCall, result: CallScoreResult) {
    setSaveState("saving");
    setSaveError(null);
    try {
      const res = await fetch("/api/calls/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: call.callId,
          status: call.info.reason,
          endedBy: call.info.endedBy,
          prospectEndReason: call.info.prospectEndReason,
          scenario: call.scenario,
          identity: call.identity,
          durationSeconds: call.durationSeconds,
          result,
          transcript: call.transcript,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save this call.");
      }
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setSaveError(err instanceof Error ? err.message : "Failed to save this call.");
    }
  }

  async function runScoring(call: FinishedCall) {
    setScoring(true);
    setScoringError(null);
    setScoreResult(null);
    setScoreProgress({});
    setSaveState("idle");
    setSaveError(null);
    try {
      const res = await fetch("/api/score/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: call.callId,
          transcript: call.transcript,
          salesProfile,
          trainingProfile: call.trainingProfile,
          scenario: call.scenario,
          durationSeconds: call.durationSeconds,
          endedBy: call.info.endedBy,
          prospectEndReason: call.info.prospectEndReason,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to score the call.");
      }
      const result: CallScoreResult = await res.json();
      setScoreResult(result);
      setRetryFocus(result.workOnNext ?? []);

      // Gamification context for the score screen — the user's own past
      // scores, read-only, fetched before this call's own row is saved below
      // so it's naturally excluded. Non-critical: fails silently.
      if (userId) {
        try {
          const { data: priorCalls } = await supabase
            .from("calls")
            .select("overall_score")
            .order("created_at", { ascending: false })
            .limit(20);
          const scores = (priorCalls ?? []).map((c) => c.overall_score as number);
          setScoreProgress(
            scores.length > 0
              ? { previousBestScore: Math.max(...scores), previousScore: scores[0], callNumber: scores.length + 1 }
              : { callNumber: 1 }
          );
        } catch {
          setScoreProgress({});
        }
      }

      // Show the score now; saving continues below with its own visible status.
      setScoring(false);
      await saveCall(call, result);
    } catch (err) {
      setScoringError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setScoring(false);
      void refreshEntitlement();
    }
  }

  function handleCallEnded(transcript: TranscriptEntry[], durationSeconds: number, callId: string, info: CallEndInfo) {
    if (!profile || !selectedScenario || !prospectIdentity) return;
    const call: FinishedCall = {
      transcript,
      durationSeconds,
      callId,
      info,
      scenario: selectedScenario,
      identity: prospectIdentity,
      trainingProfile: profile,
    };
    setFinishedCall(call);
    setCallDurationSeconds(durationSeconds);
    setCallTranscript(transcript);
    setStep("scoring");
    void runScoring(call);
  }

  function handleRetryScoring() {
    if (finishedCall) void runScoring(finishedCall);
  }

  function handleRetrySave() {
    if (finishedCall && scoreResult) void saveCall(finishedCall, scoreResult);
  }

  function handleEntitlementExhausted() {
    setStepBeforePaywall("scenarios");
    setStep("paywall");
    void refreshEntitlement();
  }

  // Retry the SAME scenario. "same" keeps this exact person and situation;
  // "fresh" is an explicit request for a different person in the same
  // scenario (its role, industry and conditions are unchanged). Neither
  // silently switches scenarios. Goes back through the Ready screen, which
  // is where the "work on this next" reminder is shown.
  async function handlePracticeAgain(mode: "same" | "fresh") {
    if (!profile || !selectedScenario) return;
    const current = (await refreshEntitlement()) ?? entitlement;
    if (current && !current.canStartCall) {
      setStepBeforePaywall("scenarios");
      setStep("paywall");
      return;
    }
    let identity = prospectIdentity ?? selectedScenario.identity ?? null;
    if (mode === "fresh" || !identity) {
      identity = newIdentityFor(selectedScenario, profile, voicePreference);
      const updated = { ...selectedScenario, identity };
      setSelectedScenario(updated);
      // Keep the picker and reloads in step with the person now on the phone.
      replaceScenarios((scenarios ?? []).map((s) => (s.id === updated.id ? updated : s)));
    }
    setProspectIdentity(identity);
    setScoreResult(null);
    setScoringError(null);
    setCallTranscript(null);
    setFinishedCall(null);
    setSaveState("idle");
    setSaveError(null);
    setStep("ready");
  }

  function handleScoreDone() {
    setRetryFocus([]);
    setFinishedCall(null);
    setSaveState("idle");
    setSaveError(null);
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

  if (step === "paywall") {
    return (
      <Paywall
        entitlement={entitlement}
        onBack={() => setStep(stepBeforePaywall)}
        onPurchased={() => {
          void refreshEntitlement();
          setStep(stepBeforePaywall);
        }}
      />
    );
  }

  if (step === "scoring" && selectedScenario && prospectIdentity) {
    return (
      <ScoreScreen
        scenario={selectedScenario}
        identity={prospectIdentity}
        durationSeconds={callDurationSeconds}
        result={scoreResult}
        loading={scoring}
        error={scoringError}
        transcript={callTranscript}
        previousBestScore={scoreProgress.previousBestScore}
        previousScore={scoreProgress.previousScore}
        callNumber={scoreProgress.callNumber}
        saveState={saveState}
        saveError={saveError}
        onRetryScoring={handleRetryScoring}
        onRetrySave={handleRetrySave}
        onPracticeAgain={(mode) => void handlePracticeAgain(mode)}
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
        onEntitlementExhausted={handleEntitlementExhausted}
        onCancel={() => setStep("ready")}
      />
    );
  }

  if (step === "ready" && profile && selectedScenario && prospectIdentity) {
    return (
      <ReadyToCall
        profile={profile}
        scenario={selectedScenario}
        identity={prospectIdentity}
        focus={retryFocus}
        onBack={handleBackToScenarios}
        onStartCall={() => setStep("call")}
      />
    );
  }

  if (step === "scenarios" && profile && scenarios) {
    return (
      <ScenarioPicker
        scenarios={scenarios}
        profile={profile}
        identities={identities}
        onSelect={(scenario) => void handleSelectScenario(scenario)}
        onBack={() => setStep("review")}
        voicePreference={voicePreference}
        onVoicePreferenceChange={handleVoicePreferenceChange}
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

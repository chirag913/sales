"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flag,
  PhoneCall,
  ShieldAlert,
  Target,
  User,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ChipsEditor } from "@/components/ui/ChipsEditor";
import { INPUT_CLASSES } from "@/components/ui/inputClasses";
import { MarketFlag } from "@/components/ui/MarketFlag";
import { CALL_TYPE_OPTIONS, CallType, PROSPECT_MARKET_OPTIONS, SALES_OBJECTIVE_OPTIONS, TrainingProfile } from "@/lib/types";

interface ProfileReviewProps {
  profile: TrainingProfile;
  onChange: (profile: TrainingProfile) => void;
  onStartOver: () => void;
  onConfirm: () => void;
  confirming: boolean;
  confirmError: string | null;
}

// Plain text only — used inside <option> (native <select> options can't
// render an SVG icon) and as the label next to the real MarketFlag icon
// where one is shown. Covers legacy UK/Canada/Australia values too, so a
// returning user's stored profile still displays a real name instead of
// the raw enum value — see the ProspectMarket comment in types.ts.
const MARKET_LABEL: Record<string, string> = {
  US: "United States",
  UK: "United Kingdom",
  Canada: "Canada",
  Australia: "Australia",
  India: "India",
  Other: "Other",
};

// Literal cold-to-warm scale (sky -> amber -> orange), not emerald — see
// Chip.tsx's tone comment for why: emerald already means "success" via
// CallResultDetail's best-moment card and readiness badges elsewhere, and
// a warm call hasn't succeeded at anything yet, it's just a different
// starting point.
const CALL_TYPE_TONE: Record<CallType, { chip: "cold" | "lukewarm" | "warm"; border: string }> = {
  cold: { chip: "cold", border: "border-sky-200 dark:border-sky-900/50" },
  cold_after_outreach: { chip: "lukewarm", border: "border-amber-200 dark:border-amber-900/50" },
  warm: { chip: "warm", border: "border-orange-200 dark:border-orange-900/50" },
};

type EditingKey =
  | "market"
  | "service"
  | "icpTitles"
  | "companySize"
  | "painPoints"
  | "likelyObjections"
  | "salesObjective"
  | "typicalProspect"
  | "callType";

function EditActions({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="mt-3 flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Save
      </button>
    </div>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 text-xs font-medium text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
    >
      Edit
    </button>
  );
}

export function ProfileReview({
  profile,
  onChange,
  onStartOver,
  onConfirm,
  confirming,
  confirmError,
}: ProfileReviewProps) {
  const [editingKey, setEditingKey] = useState<EditingKey | null>(null);
  const [draft, setDraft] = useState<Partial<TrainingProfile>>({});
  const [refineInput, setRefineInput] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const objectiveLabel = SALES_OBJECTIVE_OPTIONS.find((o) => o.value === profile.salesObjective)?.label;

  async function handleRefineSubmit(e: FormEvent) {
    e.preventDefault();
    const instruction = refineInput.trim();
    if (!instruction || refining) return;
    setRefining(true);
    setRefineError(null);
    try {
      const res = await fetch("/api/profile/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, instruction }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to update training profile.");
      }
      const updated: TrainingProfile = await res.json();
      onChange(updated);
      setEditingKey(null);
      setDraft({});
      setRefineInput("");
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRefining(false);
    }
  }

  function startEdit(key: EditingKey, initial: Partial<TrainingProfile>) {
    setEditingKey(key);
    setDraft(initial);
  }

  function cancelEdit() {
    setEditingKey(null);
    setDraft({});
  }

  function saveEdit(updates: Partial<TrainingProfile>, clearedAssumptions: (keyof TrainingProfile["assumptions"])[]) {
    const nextAssumptions = { ...profile.assumptions };
    for (const key of clearedAssumptions) nextAssumptions[key] = false;
    onChange({ ...profile, ...updates, assumptions: nextAssumptions });
    setEditingKey(null);
    setDraft({});
  }

  // Always visible (never conditional, never in the collapsed tier) — this
  // card does double duty (the call type +, for the two non-cold values,
  // the real context behind it), which is exactly why it gets a
  // temperature-matched accent border on top of the badge below.
  const callTypeCard = (
    <Card
      icon={PhoneCall}
      title="Call Type"
      assumption={editingKey !== "callType" && profile.assumptions.callType}
      borderClassName={CALL_TYPE_TONE[profile.callType]?.border}
    >
      {editingKey === "callType" ? (
        <>
          <div className="flex flex-wrap gap-2">
            {CALL_TYPE_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                selected={(draft.callType ?? profile.callType) === opt.value}
                onClick={() => setDraft((d) => ({ ...d, callType: opt.value }))}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
          {(draft.callType ?? profile.callType) !== "cold" && (
            <input
              type="text"
              className={`${INPUT_CLASSES} mt-3`}
              value={draft.priorContextDetail ?? profile.priorContextDetail ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, priorContextDetail: e.target.value }))}
              placeholder={
                (draft.callType ?? profile.callType) === "cold_after_outreach"
                  ? "e.g. You emailed them last week about pricing, no reply yet."
                  : "e.g. They requested a quote through your website last week."
              }
            />
          )}
          <EditActions
            onSave={() =>
              saveEdit(
                {
                  callType: draft.callType ?? profile.callType,
                  priorContextDetail: draft.priorContextDetail ?? profile.priorContextDetail,
                },
                ["callType", "priorContextDetail"]
              )
            }
            onCancel={cancelEdit}
          />
        </>
      ) : (
        <>
          <Chip tone={CALL_TYPE_TONE[profile.callType]?.chip ?? "cold"}>
            {CALL_TYPE_OPTIONS.find((o) => o.value === profile.callType)?.label ?? "Cold call"}
          </Chip>
          {profile.callType !== "cold" && profile.priorContextDetail && (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{profile.priorContextDetail}</p>
          )}
          <EditButton
            onClick={() => startEdit("callType", { callType: profile.callType, priorContextDetail: profile.priorContextDetail })}
          />
        </>
      )}
    </Card>
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Here&apos;s your training environment
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">Review what I put together, and edit anything that&apos;s off.</p>
      </div>

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${refining ? "pointer-events-none opacity-60" : ""}`}>
        {callTypeCard}

        <Card icon={Wrench} title="Service" assumption={editingKey !== "service" && profile.assumptions.service}>
          {editingKey === "service" ? (
            <>
              <input
                type="text"
                className={INPUT_CLASSES}
                value={draft.service ?? profile.service}
                onChange={(e) => setDraft((d) => ({ ...d, service: e.target.value }))}
              />
              <EditActions
                onSave={() => saveEdit({ service: draft.service ?? profile.service }, ["service"])}
                onCancel={cancelEdit}
              />
            </>
          ) : (
            <>
              <p className="text-lg text-zinc-900 dark:text-zinc-50">{profile.service}</p>
              <EditButton onClick={() => startEdit("service", { service: profile.service })} />
            </>
          )}
        </Card>

        <Card icon={User} title="Who You're Calling" assumption={editingKey !== "icpTitles" && profile.assumptions.icpTitles}>
          {editingKey === "icpTitles" ? (
            <>
              <ChipsEditor
                values={draft.icpTitles ?? profile.icpTitles}
                onChange={(values) => setDraft((d) => ({ ...d, icpTitles: values }))}
                placeholder="Add a job title"
              />
              <EditActions
                onSave={() => saveEdit({ icpTitles: draft.icpTitles ?? profile.icpTitles }, ["icpTitles"])}
                onCancel={cancelEdit}
              />
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {profile.icpTitles.map((title) => (
                  <Chip key={title}>{title}</Chip>
                ))}
              </div>
              <EditButton onClick={() => startEdit("icpTitles", { icpTitles: profile.icpTitles })} />
            </>
          )}
        </Card>

        <Card icon={Flag} title="Sales Objective" assumption={editingKey !== "salesObjective" && profile.assumptions.salesObjective}>
          {editingKey === "salesObjective" ? (
            <>
              <select
                className={INPUT_CLASSES}
                value={draft.salesObjective ?? profile.salesObjective}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, salesObjective: e.target.value as TrainingProfile["salesObjective"] }))
                }
              >
                {SALES_OBJECTIVE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className={`${INPUT_CLASSES} mt-3`}
                value={draft.salesObjectiveDetail ?? profile.salesObjectiveDetail}
                onChange={(e) => setDraft((d) => ({ ...d, salesObjectiveDetail: e.target.value }))}
                placeholder="e.g. Book an onsite walkthrough / estimate"
              />
              <EditActions
                onSave={() =>
                  saveEdit(
                    {
                      salesObjective: draft.salesObjective ?? profile.salesObjective,
                      salesObjectiveDetail: draft.salesObjectiveDetail ?? profile.salesObjectiveDetail,
                    },
                    ["salesObjective"]
                  )
                }
                onCancel={cancelEdit}
              />
            </>
          ) : (
            <>
              <p className="text-lg text-zinc-900 dark:text-zinc-50">{objectiveLabel}</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{profile.salesObjectiveDetail}</p>
              <EditButton
                onClick={() =>
                  startEdit("salesObjective", {
                    salesObjective: profile.salesObjective,
                    salesObjectiveDetail: profile.salesObjectiveDetail,
                  })
                }
              />
            </>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowDetails((open) => !open)}
          className="flex w-full items-center justify-between rounded-2xl border border-zinc-200/70 bg-white px-5 py-3 text-left dark:border-zinc-800 dark:bg-zinc-950"
        >
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Show all details</span>
          <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
            {showDetails ? "Hide" : "Show"}
            {showDetails ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
          </span>
        </button>

        {showDetails && (
          <div className={`mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 ${refining ? "pointer-events-none opacity-60" : ""}`}>
            <Card icon={Target} title="Target Market" assumption={editingKey !== "market" && profile.assumptions.market}>
              {editingKey === "market" ? (
                <>
                  <select
                    className={INPUT_CLASSES}
                    value={draft.market ?? profile.market}
                    onChange={(e) => setDraft((d) => ({ ...d, market: e.target.value as TrainingProfile["market"] }))}
                  >
                    {PROSPECT_MARKET_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                    {/* A returning user's profile can still have a market
                        (UK/Canada/Australia) that's no longer offered above —
                        surface it as a selectable option rather than letting
                        the select silently show nothing selected. Disappears
                        on its own once they pick one of the current options. */}
                    {!PROSPECT_MARKET_OPTIONS.some((opt) => opt.value === (draft.market ?? profile.market)) && (
                      <option value={draft.market ?? profile.market}>
                        {MARKET_LABEL[draft.market ?? profile.market] ?? (draft.market ?? profile.market)}
                      </option>
                    )}
                  </select>
                  <EditActions
                    onSave={() => saveEdit({ market: draft.market ?? profile.market }, ["market"])}
                    onCancel={cancelEdit}
                  />
                </>
              ) : (
                <>
                  <p className="flex items-center gap-2 text-lg text-zinc-900 dark:text-zinc-50">
                    <MarketFlag market={profile.market} className="h-4 w-6 shrink-0" />
                    {MARKET_LABEL[profile.market] ?? profile.market}
                  </p>
                  <EditButton onClick={() => startEdit("market", { market: profile.market })} />
                </>
              )}
            </Card>

            <Card icon={Building2} title="Company Size" assumption={editingKey !== "companySize" && profile.assumptions.companySizeRange}>
              {editingKey === "companySize" ? (
                <>
                  <input
                    type="text"
                    className={INPUT_CLASSES}
                    value={draft.companySizeRange ?? profile.companySizeRange}
                    onChange={(e) => setDraft((d) => ({ ...d, companySizeRange: e.target.value }))}
                    placeholder="e.g. 10-100 employees"
                  />
                  <div className="mt-3">
                    <ChipsEditor
                      values={draft.additionalCriteria ?? profile.additionalCriteria}
                      onChange={(values) => setDraft((d) => ({ ...d, additionalCriteria: values }))}
                      placeholder="Add a qualifying detail"
                    />
                  </div>
                  <EditActions
                    onSave={() =>
                      saveEdit(
                        {
                          companySizeRange: draft.companySizeRange ?? profile.companySizeRange,
                          additionalCriteria: draft.additionalCriteria ?? profile.additionalCriteria,
                        },
                        ["companySizeRange", "additionalCriteria"]
                      )
                    }
                    onCancel={cancelEdit}
                  />
                </>
              ) : (
                <>
                  <p className="text-lg text-zinc-900 dark:text-zinc-50">{profile.companySizeRange}</p>
                  {profile.additionalCriteria.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {profile.additionalCriteria.map((c) => (
                        <Chip key={c}>{c}</Chip>
                      ))}
                    </div>
                  )}
                  <EditButton
                    onClick={() =>
                      startEdit("companySize", {
                        companySizeRange: profile.companySizeRange,
                        additionalCriteria: profile.additionalCriteria,
                      })
                    }
                  />
                </>
              )}
            </Card>

            <Card icon={AlertTriangle} title="Likely Pain Points" assumption={editingKey !== "painPoints" && profile.assumptions.painPoints}>
              {editingKey === "painPoints" ? (
                <>
                  <ChipsEditor
                    values={draft.painPoints ?? profile.painPoints}
                    onChange={(values) => setDraft((d) => ({ ...d, painPoints: values }))}
                    placeholder="Add a pain point"
                  />
                  <EditActions
                    onSave={() => saveEdit({ painPoints: draft.painPoints ?? profile.painPoints }, ["painPoints"])}
                    onCancel={cancelEdit}
                  />
                </>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {profile.painPoints.map((p) => (
                      <Chip key={p}>{p}</Chip>
                    ))}
                  </div>
                  <EditButton onClick={() => startEdit("painPoints", { painPoints: profile.painPoints })} />
                </>
              )}
            </Card>

            <Card
              icon={ShieldAlert}
              title="Likely Objections"
              assumption={editingKey !== "likelyObjections" && profile.assumptions.likelyObjections}
            >
              {editingKey === "likelyObjections" ? (
                <>
                  <ChipsEditor
                    values={draft.likelyObjections ?? profile.likelyObjections}
                    onChange={(values) => setDraft((d) => ({ ...d, likelyObjections: values }))}
                    placeholder="Add an objection"
                  />
                  <EditActions
                    onSave={() =>
                      saveEdit({ likelyObjections: draft.likelyObjections ?? profile.likelyObjections }, ["likelyObjections"])
                    }
                    onCancel={cancelEdit}
                  />
                </>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {profile.likelyObjections.map((o) => (
                      <Chip key={o}>{o}</Chip>
                    ))}
                  </div>
                  <EditButton onClick={() => startEdit("likelyObjections", { likelyObjections: profile.likelyObjections })} />
                </>
              )}
            </Card>

            <Card
              icon={User}
              title="Typical Prospect"
              assumption={editingKey !== "typicalProspect" && profile.assumptions.typicalProspect}
            >
              {editingKey === "typicalProspect" ? (
                <>
                  <textarea
                    className={`${INPUT_CLASSES} min-h-[80px] resize-y`}
                    value={draft.typicalProspect ?? profile.typicalProspect}
                    onChange={(e) => setDraft((d) => ({ ...d, typicalProspect: e.target.value }))}
                  />
                  <EditActions
                    onSave={() => saveEdit({ typicalProspect: draft.typicalProspect ?? profile.typicalProspect }, ["typicalProspect"])}
                    onCancel={cancelEdit}
                  />
                </>
              ) : (
                <>
                  <p className="text-zinc-700 dark:text-zinc-300">{profile.typicalProspect}</p>
                  <EditButton onClick={() => startEdit("typicalProspect", { typicalProspect: profile.typicalProspect })} />
                </>
              )}
            </Card>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <label htmlFor="refine-input" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Want to change anything?
        </label>
        <form onSubmit={handleRefineSubmit} className="flex flex-col gap-2 sm:flex-row">
          <input
            id="refine-input"
            type="text"
            value={refineInput}
            onChange={(e) => setRefineInput(e.target.value)}
            placeholder="e.g. Focus on Texas and target property managers."
            className={INPUT_CLASSES}
            disabled={refining}
          />
          <Button type="submit" disabled={!refineInput.trim() || refining} className="shrink-0">
            {refining ? "Updating…" : "Update"}
          </Button>
        </form>
        {refineError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{refineError}</p>}
      </div>

      <div className="mt-10 flex flex-col items-center gap-4 text-center">
        <p className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Your training environment is ready.</p>
        <Button onClick={onConfirm} disabled={confirming} className="gap-2 px-6 py-3 text-base">
          {confirming ? (
            "Building scenarios…"
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Looks Good — Start Training
            </>
          )}
        </Button>
        {confirmError && <p className="text-sm text-red-600 dark:text-red-400">{confirmError}</p>}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Link href="/profile" className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400">
          Add company details, proof &amp; credibility →
        </Link>
        <button
          type="button"
          onClick={onStartOver}
          className="text-sm text-zinc-400 underline-offset-4 hover:underline dark:text-zinc-500"
        >
          Start over
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { BuyCreditsButton } from "@/components/onboarding/BuyCreditsButton";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { FormField } from "@/components/ui/FormField";
import { FormSection } from "@/components/ui/FormSection";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { CREDIT_PACK_CALLS, CREDIT_PACK_PRICE_INR, TRIAL_CALL_MINUTES } from "@/lib/config/pricing";
import { READINESS_MIN_AVG_SCORE, READINESS_MIN_CALLS } from "@/lib/config/readiness";
import { MyTeamResponse, TeamMemberAnalytics, TeamMemberRow } from "@/lib/team/types";

// Framed around rough team size, not raw pack count — an agency owner
// thinks "how many people," not "how many 40-call packs." Illustrative
// people-estimates only; no per-person threshold exists elsewhere in this
// codebase to line these up against (checked before writing these).
const QUANTITY_PRESETS = [
  { quantity: 1, label: "Small team", sublabel: "~1-2 people" },
  { quantity: 3, label: "Growing team", sublabel: "~4-6 people" },
  { quantity: 5, label: "Full team", sublabel: "~8-10 people" },
  { quantity: 10, label: "Large team", sublabel: "~15-20 people" },
];

async function fetchMyTeam(): Promise<MyTeamResponse | null> {
  try {
    const res = await fetch("/api/teams/mine");
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function fetchTeamAnalytics(): Promise<TeamMemberAnalytics[] | null> {
  try {
    const res = await fetch("/api/teams/analytics");
    if (!res.ok) return null;
    const body = await res.json();
    return body.members as TeamMemberAnalytics[];
  } catch {
    return null;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isReady(a: TeamMemberAnalytics): boolean {
  return a.totalCalls >= READINESS_MIN_CALLS && (a.avgOverallScore ?? 0) >= READINESS_MIN_AVG_SCORE;
}

// The get_team_member_analytics() RPC only includes the owner if they have
// at least one call themselves (most owners are managers, not practicers —
// see the migration comment in supabase/migrations/0014_team_analytics.sql).
// Every other active member is always present, even at zero calls. So a
// missing row for an active member can only mean "owner, zero calls" —
// this fills that in for display rather than silently showing nothing,
// without inventing any new fetch or business rule.
function analyticsFor(member: TeamMemberRow, analytics: TeamMemberAnalytics[] | null): TeamMemberAnalytics | null {
  if (member.status !== "active") return null;
  const found = analytics?.find((a) => a.userId === member.userId);
  if (found) return found;
  if (analytics === null) return null;
  return { userId: member.userId, email: member.email, totalCalls: 0, avgOverallScore: null, lastCallAt: null, topObjectionTags: [] };
}

// Shared inline two-step confirm — no Dialog/Modal primitive exists
// anywhere in this codebase, so this stays an inline expansion rather than
// introducing one just for a handful of call sites. Two tones: "warning"
// for a heads-up that isn't actually destructive (creating a team is
// reversible — leave it and personal credits are active again), "danger"
// for something genuinely irreversible (delete team, leave team), matching
// the Chip component's own tone prop for the same neutral-vs-positive
// distinction elsewhere in this file.
function InlineConfirm({
  tone,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  loading,
  error,
}: {
  tone: "warning" | "danger";
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}) {
  const boxClasses =
    tone === "danger"
      ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
      : "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30";
  const textClasses = tone === "danger" ? "text-red-700 dark:text-red-300" : "text-amber-800 dark:text-amber-300";

  return (
    <div className={`mt-3 rounded-xl border p-4 ${boxClasses}`}>
      <p className={`text-sm ${textClasses}`}>{message}</p>
      <div className="mt-3 flex gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} disabled={loading}>
          {loading ? "Working…" : confirmLabel}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function CreateTeamForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/teams/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error === "already_on_a_team" ? "You're already on a team." : "Failed to create team."
        );
      }
      // The nav badge (AuthenticatedShell) only fetches entitlement status
      // on mount — creating a team changes what it should show (team pool
      // instead of personal credits) without a navigation, so it wouldn't
      // otherwise refresh until the next full page load.
      window.dispatchEvent(new Event("team-entitlement-changed"));
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setConfirming(false); // back to the plain form, not stuck behind the confirm box
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormSection
      title="Create a team"
      description="Pool credits across your team and see who's practicing. You'll be the team owner."
    >
      <FormField label="Team name" value={name} onChange={setName} placeholder="Acme Sales Agency" disabled={confirming} />
      <div className="flex items-end">
        {!confirming && (
          <Button onClick={() => setConfirming(true)} disabled={!name.trim()}>
            Create team
          </Button>
        )}
      </div>
      {confirming && (
        <div className="sm:col-span-2">
          <InlineConfirm
            tone="warning"
            message="Creating a team switches you to a shared team pool. Your personal credits become inactive while you're on a team — they aren't lost, just not used until you leave. Continue?"
            confirmLabel="Yes, create team"
            onConfirm={() => void handleCreate()}
            onCancel={() => setConfirming(false)}
            loading={loading}
            error={error}
          />
        </div>
      )}
      {!confirming && error && <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-2">{error}</p>}
    </FormSection>
  );
}

function InviteForm({ teamId, onInvited }: { teamId: string; onInvited: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleInvite() {
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    setInviteUrl(null);
    try {
      const res = await fetch("/api/teams/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, email }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error === "invalid_email" ? "Enter a valid email." : "Failed to create invite.");
      setInviteUrl(body.inviteUrl as string);
      setEmail("");
      onInvited();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Invite a member</p>
      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
        We don&apos;t send an email yet — you&apos;ll get a link to share yourself.
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <FormField label="Email" value={email} onChange={setEmail} placeholder="teammate@company.com" />
        </div>
        <Button onClick={() => void handleInvite()} disabled={loading || !email.trim()}>
          {loading ? "Sending…" : "Create invite link"}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {inviteUrl && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
          <input readOnly value={inviteUrl} className="flex-1 truncate bg-transparent text-sm text-zinc-700 outline-none dark:text-zinc-300" />
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="shrink-0 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}

function BuyTeamCreditsControl({ teamId, onPurchased }: { teamId: string; onPurchased: () => void }) {
  const [quantity, setQuantity] = useState(1);
  // Which chip reads as selected — deliberately its own flag rather than
  // inferring "custom" from quantity not matching a preset: if the owner
  // opens the stepper and dials it to a number that happens to match a
  // preset (e.g. lands back on 5), the explicitly-chosen "Custom amount"
  // chip should stay selected, not silently swap back to "Full team".
  const [customMode, setCustomMode] = useState(false);
  const totalCalls = CREDIT_PACK_CALLS * quantity;
  const totalPrice = CREDIT_PACK_PRICE_INR * quantity;
  const totalMinutes = totalCalls * TRIAL_CALL_MINUTES;

  function setBoundedQuantity(next: number) {
    if (!Number.isFinite(next)) return;
    setQuantity(Math.min(20, Math.max(1, Math.round(next))));
  }

  function handlePurchased() {
    // The owner is also an active member of their own team, so their own
    // nav badge shows the team pool (AuthenticatedShell) — same reason
    // CreateTeamForm dispatches this, see its comment above.
    window.dispatchEvent(new Event("team-entitlement-changed"));
    onPurchased();
  }

  return (
    <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        Buy credits for your team
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {QUANTITY_PRESETS.map((preset) => (
          <Chip
            key={preset.quantity}
            selected={!customMode && quantity === preset.quantity}
            onClick={() => {
              setQuantity(preset.quantity);
              setCustomMode(false);
            }}
          >
            <span className="flex flex-col items-start leading-tight">
              <span>{preset.label}</span>
              <span className="text-[10px] opacity-70">{preset.sublabel}</span>
            </span>
          </Chip>
        ))}
        <Chip selected={customMode} onClick={() => setCustomMode(true)}>
          Custom amount
        </Chip>
      </div>

      {customMode && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBoundedQuantity(quantity - 1)}
            disabled={quantity <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Fewer packs"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={20}
            value={quantity}
            onChange={(e) => setBoundedQuantity(Number(e.target.value))}
            className="w-14 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-center text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <button
            type="button"
            onClick={() => setBoundedQuantity(quantity + 1)}
            disabled={quantity >= 20}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="More packs"
          >
            +
          </button>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">packs (1-20)</span>
        </div>
      )}

      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
        {totalCalls} calls · up to {totalMinutes} min · ₹{totalPrice}
      </p>

      <div className="mt-3">
        <BuyCreditsButton
          quantity={quantity}
          teamId={teamId}
          onSuccess={handlePurchased}
          label={`Buy ${totalCalls} calls — ₹${totalPrice}`}
        />
      </div>
    </div>
  );
}

function DeleteTeamControl({ team, onDeleted }: { team: Extract<MyTeamResponse, { role: "owner" }>; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memberCount = team.members.filter((m) => m.role !== "owner").length;

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teams/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.teamId }),
      });
      if (!res.ok) throw new Error("Failed to delete team.");
      // Deleting refunds the pool to the owner's own personal balance and
      // ends their team membership — both change what the nav badge should
      // show (AuthenticatedShell), same reason other team mutations here do
      // this.
      window.dispatchEvent(new Event("team-entitlement-changed"));
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-b-2xl border-t border-zinc-100 p-6 dark:border-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Danger zone</p>
      {!confirming ? (
        <Button variant="danger" className="mt-3" onClick={() => setConfirming(true)}>
          Delete team
        </Button>
      ) : (
        <InlineConfirm
          tone="danger"
          message={`This removes all ${memberCount} member${memberCount === 1 ? "" : "s"} from the team and refunds ${team.creditsBalance} remaining credit${team.creditsBalance === 1 ? "" : "s"} to your personal balance. This cannot be undone.`}
          confirmLabel="Yes, delete team"
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirming(false)}
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
}

function EmptyRosterState() {
  return (
    <div className="mt-3 flex flex-col items-center gap-1 rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center dark:border-zinc-700">
      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">It&apos;s just you so far.</p>
      <p className="max-w-xs text-sm text-zinc-400 dark:text-zinc-500">
        Invite your first team member below to start pooling credits and tracking practice.
      </p>
    </div>
  );
}

function MemberRow({
  member,
  analytics,
  analyticsLoading,
  onRemove,
  removing,
}: {
  member: TeamMemberRow;
  analytics: TeamMemberAnalytics | null;
  analyticsLoading: boolean;
  onRemove?: (userId: string) => void;
  removing?: boolean;
}) {
  const ready = analytics ? isReady(analytics) : false;

  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <InitialsAvatar label={member.email} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{member.email}</p>
          <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
            {member.role === "owner" ? "Owner" : "Member"} ·{" "}
            {member.status === "invited" ? "Invited" : `Joined ${formatDate(member.joinedAt)}`}
          </p>

          {member.status === "active" &&
            (analyticsLoading ? (
              <div className="mt-1.5 h-3 w-40 max-w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            ) : (
              analytics && (
                <>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    {analytics.totalCalls === 0
                      ? "No calls yet"
                      : `${analytics.totalCalls} call${analytics.totalCalls === 1 ? "" : "s"} · avg score ${analytics.avgOverallScore} · last practiced ${formatDate(analytics.lastCallAt)}`}
                  </p>
                  {analytics.topObjectionTags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {analytics.topObjectionTags.map((tag) => (
                        <Chip key={tag}>{tag}</Chip>
                      ))}
                    </div>
                  )}
                </>
              )
            ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 pl-[52px] sm:pl-0">
        {analytics && analytics.totalCalls > 0 && (
          <Chip tone={ready ? "positive" : "neutral"}>{ready ? "Ready" : "Still practicing"}</Chip>
        )}
        {member.status === "invited" && <Chip>Invited</Chip>}
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(member.userId)}
            disabled={removing}
            className="text-xs text-zinc-400 underline-offset-4 hover:text-red-600 hover:underline disabled:opacity-50 dark:text-zinc-500 dark:hover:text-red-400"
          >
            {removing ? "Removing…" : "Remove"}
          </button>
        )}
      </div>
    </div>
  );
}

function OwnerView({
  team,
  analytics,
  onRefresh,
}: {
  team: Extract<MyTeamResponse, { role: "owner" }>;
  analytics: TeamMemberAnalytics[] | null;
  onRefresh: () => void;
}) {
  const [removing, setRemoving] = useState<string | null>(null);
  const [showBuyCredits, setShowBuyCredits] = useState(false);

  async function handleRemove(userId: string) {
    setRemoving(userId);
    try {
      await fetch("/api/teams/remove-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.teamId, userId }),
      });
      onRefresh();
    } finally {
      setRemoving(null);
    }
  }

  const analyticsLoading = analytics === null;
  const hasOtherMembers = team.members.length > 1;
  const hasInvites = team.invites.length > 0;

  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      {/* Identity + compact credit-pool indicator */}
      <div className="flex flex-col gap-4 border-b border-zinc-100 p-6 dark:border-zinc-900 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{team.teamName}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">You own this team.</p>
        </div>
        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-start sm:gap-1">
          <div className="text-left sm:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Credit pool</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{team.creditsBalance} calls</p>
          </div>
          <button
            type="button"
            onClick={() => setShowBuyCredits((v) => !v)}
            className="text-xs text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
          >
            {showBuyCredits ? "Hide" : "Top up"}
          </button>
        </div>
      </div>

      {/* Member roster — primary content */}
      <div className="p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Members · {team.members.length}
        </p>
        <div className="mt-2 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-900">
          {team.members.map((m) => (
            <MemberRow
              key={m.userId}
              member={m}
              analytics={analyticsFor(m, analytics)}
              analyticsLoading={m.status === "active" && analyticsLoading}
              onRemove={m.role !== "owner" ? handleRemove : undefined}
              removing={removing === m.userId}
            />
          ))}
        </div>
        {!hasOtherMembers && !hasInvites && <EmptyRosterState />}
      </div>

      {/* Actions — visually secondary, clearly separated from the roster */}
      <div className="border-t border-zinc-100 bg-zinc-50/60 p-6 dark:border-zinc-900 dark:bg-zinc-900/20">
        {hasInvites && (
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Pending invites
            </p>
            <div className="mt-2 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-900">
              {team.invites.map((inv) => (
                <div key={inv.email} className="flex items-center justify-between gap-3 py-2">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{inv.email}</p>
                  <Chip>expires {formatDate(inv.expiresAt)}</Chip>
                </div>
              ))}
            </div>
          </div>
        )}

        <InviteForm teamId={team.teamId} onInvited={onRefresh} />

        {showBuyCredits && <BuyTeamCreditsControl teamId={team.teamId} onPurchased={onRefresh} />}
      </div>

      <DeleteTeamControl team={team} onDeleted={onRefresh} />
    </div>
  );
}

function LeaveTeamControl({ onLeft }: { onLeft: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLeave() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teams/leave", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? "Failed to leave team.");
      }
      // Leaving switches this user back to their own personal credits —
      // changes what the nav badge should show (AuthenticatedShell), same
      // reason other team mutations here do this.
      window.dispatchEvent(new Event("team-entitlement-changed"));
      onLeft();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <Button variant="danger" onClick={() => setConfirming(true)}>
        Leave team
      </Button>
    );
  }

  return (
    <InlineConfirm
      tone="danger"
      message="You'll switch back to your own personal credits. This cannot be undone."
      confirmLabel="Yes, leave team"
      onConfirm={() => void handleLeave()}
      onCancel={() => setConfirming(false)}
      loading={loading}
      error={error}
    />
  );
}

function MemberView({
  team,
  onLeft,
}: {
  team: Extract<MyTeamResponse, { role: "member" }>;
  onLeft: () => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{team.teamName}</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">You&apos;re a member of this team.</p>

      <div className="mt-5 flex items-center gap-2">
        <Chip>{team.status}</Chip>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Your practice calls draw from this team&apos;s shared credit pool.
        </p>
      </div>

      <div className="mt-6 border-t border-zinc-100 pt-6 dark:border-zinc-900">
        <LeaveTeamControl onLeft={onLeft} />
      </div>
    </div>
  );
}

function TeamSectionSkeleton() {
  return (
    <div
      className="animate-pulse rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      aria-hidden
    >
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-4 w-16 rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
      <div className="mt-8 flex flex-col gap-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800" />
            <div className="flex-1">
              <div className="h-3.5 w-40 rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="mt-2 h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeamSection() {
  const [team, setTeam] = useState<MyTeamResponse | null>(null);
  const [analytics, setAnalytics] = useState<TeamMemberAnalytics[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Analytics rides the same refresh cycle as team data (mount, and after
  // invite/remove/create actions) rather than having its own fetch
  // lifecycle — only fetched at all when the caller turns out to be the
  // owner, since /api/teams/analytics is owner-only.
  function refresh() {
    void fetchMyTeam().then((data) => {
      setTeam(data);
      setLoading(false);
      if (data?.role === "owner") {
        void fetchTeamAnalytics().then(setAnalytics);
      } else {
        setAnalytics(null);
      }
    });
  }

  useEffect(() => {
    refresh();
  }, []);

  if (loading) return <TeamSectionSkeleton />;
  if (!team) return null;

  if (team.role === "owner") return <OwnerView team={team} analytics={analytics} onRefresh={refresh} />;
  if (team.role === "member") return <MemberView team={team} onLeft={refresh} />;
  return <CreateTeamForm onCreated={refresh} />;
}

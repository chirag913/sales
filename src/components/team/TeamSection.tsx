"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { FormField } from "@/components/ui/FormField";
import { FormSection } from "@/components/ui/FormSection";
import { MyTeamResponse } from "@/lib/team/types";

async function fetchMyTeam(): Promise<MyTeamResponse | null> {
  try {
    const res = await fetch("/api/teams/mine");
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function CreateTeamForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormSection
      title="Create a team"
      description="Pool credits across your team and see who's practicing. You'll be the team owner."
    >
      <FormField label="Team name" value={name} onChange={setName} placeholder="Acme Sales Agency" />
      <div className="flex items-end">
        <Button onClick={() => void handleCreate()} disabled={loading || !name.trim()}>
          {loading ? "Creating…" : "Create team"}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-2">{error}</p>}
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
    <div className="mt-6 border-t border-zinc-100 pt-6 dark:border-zinc-900">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Invite a member</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
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
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
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

function OwnerView({ team, onRefresh }: { team: Extract<MyTeamResponse, { role: "owner" }>; onRefresh: () => void }) {
  const [removing, setRemoving] = useState<string | null>(null);

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

  return (
    <FormSection title={team.teamName} description="You own this team.">
      <div className="sm:col-span-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Team credit pool</p>
        <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{team.creditsBalance} calls</p>

        {team.members.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Members</p>
            <div className="mt-2 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-900">
              {team.members.map((m) => (
                <div key={m.userId} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-sm text-zinc-900 dark:text-zinc-50">{m.email}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      {m.role === "owner" ? "Owner" : "Member"} · joined {formatDate(m.joinedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip>{m.status}</Chip>
                    {m.role !== "owner" && (
                      <button
                        type="button"
                        onClick={() => void handleRemove(m.userId)}
                        disabled={removing === m.userId}
                        className="text-xs text-zinc-400 underline-offset-4 hover:text-red-600 hover:underline disabled:opacity-50 dark:text-zinc-500 dark:hover:text-red-400"
                      >
                        {removing === m.userId ? "Removing…" : "Remove"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {team.invites.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Pending invites</p>
            <div className="mt-2 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-900">
              {team.invites.map((inv) => (
                <div key={inv.email} className="flex items-center justify-between gap-3 py-2.5">
                  <p className="text-sm text-zinc-900 dark:text-zinc-50">{inv.email}</p>
                  <Chip>expires {formatDate(inv.expiresAt)}</Chip>
                </div>
              ))}
            </div>
          </div>
        )}

        <InviteForm teamId={team.teamId} onInvited={onRefresh} />
      </div>
    </FormSection>
  );
}

function MemberView({ team }: { team: Extract<MyTeamResponse, { role: "member" }> }) {
  return (
    <FormSection title={team.teamName} description="You're a member of this team.">
      <div className="flex items-center gap-2 sm:col-span-2">
        <Chip>{team.status}</Chip>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Your practice calls draw from this team&apos;s shared credit pool.
        </p>
      </div>
    </FormSection>
  );
}

export function TeamSection() {
  const [team, setTeam] = useState<MyTeamResponse | null>(null);
  const [loading, setLoading] = useState(true);

  function refresh() {
    void fetchMyTeam().then((data) => {
      setTeam(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    refresh();
  }, []);

  if (loading || !team) return null;

  if (team.role === "owner") return <OwnerView team={team} onRefresh={refresh} />;
  if (team.role === "member") return <MemberView team={team} />;
  return <CreateTeamForm onCreated={refresh} />;
}

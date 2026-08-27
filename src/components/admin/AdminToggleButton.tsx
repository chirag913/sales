"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface AdminToggleButtonProps {
  targetUserId: string;
  isAdmin: boolean;
  isSelf: boolean;
}

export function AdminToggleButton({ targetUserId, isAdmin, isSelf }: AdminToggleButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/toggle-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Failed to update admin status.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" onClick={handleClick} disabled={loading} className="px-3 py-1.5 text-xs">
        {loading ? "Please wait…" : isAdmin ? "Remove admin" : "Make admin"}
      </Button>
      {isSelf && isAdmin && <span className="text-[11px] text-zinc-400 dark:text-zinc-600">You</span>}
      {error && <span className="max-w-[160px] text-right text-[11px] text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}

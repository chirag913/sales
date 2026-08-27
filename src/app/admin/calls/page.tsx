import { AdminPagination } from "@/components/admin/AdminPagination";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 20;

interface AdminCallRow {
  id: string;
  user_email: string;
  scenario_name: string | null;
  scenario_difficulty: string | null;
  duration_seconds: number;
  overall_score: number;
  created_at: string;
  total_count: number;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminCallsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_admin_calls", { p_limit: PAGE_SIZE, p_offset: offset });

  if (error) {
    console.error("admin calls: rpc failed", error);
    return <p className="text-sm text-red-600 dark:text-red-400">Failed to load calls. Check server logs.</p>;
  }

  const rows = (data ?? []) as AdminCallRow[];
  const totalCount = rows[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Calls</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {totalCount.toLocaleString("en-IN")} call{totalCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200/70 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200/70 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Scenario</th>
              <th className="px-4 py-3 font-medium">Difficulty</th>
              <th className="px-4 py-3 text-right font-medium">Duration</th>
              <th className="px-4 py-3 text-right font-medium">Score</th>
              <th className="px-4 py-3 font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-400 dark:text-zinc-600">
                  No calls on this page.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{row.user_email}</td>
                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">{row.scenario_name || "—"}</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{row.scenario_difficulty || "—"}</td>
                  <td className="px-4 py-3 text-right text-zinc-900 dark:text-zinc-50">
                    {formatDuration(row.duration_seconds)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-900 dark:text-zinc-50">{row.overall_score}</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{formatDateTime(row.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination page={page} totalPages={totalPages} basePath="/admin/calls" />
    </div>
  );
}

import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminToggleButton } from "@/components/admin/AdminToggleButton";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 20;

interface AdminUserRow {
  id: string;
  full_name: string | null;
  email: string;
  mobile_number: string | null;
  country: string | null;
  city: string | null;
  created_at: string;
  trial_calls_used: number;
  credits_balance: number;
  is_admin: boolean;
  total_calls_made: number;
  total_paid_inr: number;
  total_count: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const currentUserId = authData?.claims?.sub as string | undefined;

  const { data, error } = await supabase.rpc("list_admin_users", { p_limit: PAGE_SIZE, p_offset: offset });

  if (error) {
    console.error("admin users: rpc failed", error);
    return <p className="text-sm text-red-600 dark:text-red-400">Failed to load users. Check server logs.</p>;
  }

  const rows = (data ?? []) as AdminUserRow[];
  const totalCount = rows[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Users</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {totalCount.toLocaleString("en-IN")} user{totalCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200/70 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200/70 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 text-right font-medium">Calls</th>
              <th className="px-4 py-3 text-right font-medium">Credits</th>
              <th className="px-4 py-3 text-right font-medium">Paid</th>
              <th className="px-4 py-3 text-right font-medium">Admin</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-zinc-400 dark:text-zinc-600">
                  No users on this page.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">{row.full_name || "—"}</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{row.email}</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {[row.city, row.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3 text-right text-zinc-900 dark:text-zinc-50">{row.total_calls_made}</td>
                  <td className="px-4 py-3 text-right text-zinc-900 dark:text-zinc-50">{row.credits_balance}</td>
                  <td className="px-4 py-3 text-right text-zinc-900 dark:text-zinc-50">
                    {row.total_paid_inr > 0 ? `₹${row.total_paid_inr.toLocaleString("en-IN")}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <AdminToggleButton
                        targetUserId={row.id}
                        isAdmin={row.is_admin}
                        isSelf={row.id === currentUserId}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination page={page} totalPages={totalPages} basePath="/admin/users" />
    </div>
  );
}

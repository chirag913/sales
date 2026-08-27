import { CreditCard, IndianRupee, Phone, TrendingDown, Users, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { AI_COST_PER_MINUTE_INR } from "@/lib/config/pricing";
import { createClient } from "@/lib/supabase/server";

interface AdminOverview {
  total_users: number;
  new_users_today: number;
  new_users_this_week: number;
  paid_users: number;
  trial_only_users: number;
  total_revenue_inr: number;
  total_calls: number;
  total_minutes_used: number;
  estimated_ai_cost_today_inr: number;
  estimated_ai_cost_this_week_inr: number;
  estimated_ai_cost_all_time_inr: number;
}

function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{value}</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_admin_overview", { p_ai_cost_per_minute_inr: AI_COST_PER_MINUTE_INR })
    .single();

  if (error || !data) {
    console.error("admin overview: rpc failed", error);
    return (
      <p className="text-sm text-red-600 dark:text-red-400">Failed to load the overview. Check server logs.</p>
    );
  }

  const overview = data as AdminOverview;
  const margin = overview.total_revenue_inr - overview.estimated_ai_cost_all_time_inr;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Overview</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Key numbers across the whole product.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card icon={Users} title="Signups">
          <Stat value={overview.total_users.toLocaleString("en-IN")} label="Total users" />
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            +{overview.new_users_today} today · +{overview.new_users_this_week} this week
          </p>
        </Card>

        <Card icon={CreditCard} title="Paid vs. trial-only">
          <Stat value={overview.paid_users.toLocaleString("en-IN")} label="Paying users" />
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            {overview.trial_only_users.toLocaleString("en-IN")} trial-only
          </p>
        </Card>

        <Card icon={IndianRupee} title="Revenue">
          <Stat value={formatInr(overview.total_revenue_inr)} label="Total collected" />
        </Card>

        <Card icon={Phone} title="Calls">
          <Stat value={overview.total_calls.toLocaleString("en-IN")} label="Total calls" />
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            {overview.total_minutes_used.toLocaleString("en-IN")} minutes of call audio
          </p>
        </Card>

        <Card icon={TrendingDown} title="Estimated AI cost">
          <Stat value={formatInr(overview.estimated_ai_cost_all_time_inr)} label="Estimated, all-time" />
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Estimated {formatInr(overview.estimated_ai_cost_today_inr)} today · Estimated{" "}
            {formatInr(overview.estimated_ai_cost_this_week_inr)} this week
          </p>
          <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-600">
            Call minutes × ₹{AI_COST_PER_MINUTE_INR}/min — not a verified spend figure.
          </p>
        </Card>

        <Card icon={Wallet} title="Estimated margin">
          <Stat value={formatInr(margin)} label="Revenue minus estimated AI cost, all-time" />
        </Card>
      </div>
    </div>
  );
}

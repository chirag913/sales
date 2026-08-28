import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

// Secure server-side credit service, ready for a future Razorpay integration.
// Not called from anywhere yet — this is intentionally just infrastructure.
//
// A future payment webhook would, after verifying the payment signature
// server-side, call:
//   addCredits({ userId, credits: CREDIT_PACK_CALLS, provider: "razorpay",
//                providerPaymentId: razorpayPaymentId, providerOrderId: razorpayOrderId,
//                amountInr: CREDIT_PACK_PRICE_INR })
//
// Idempotent per (provider, providerPaymentId) at the database level
// (supabase/migrations/0003_entitlements.sql's add_credits() function) — the
// same verified payment can never add credits twice, even if the webhook
// fires more than once.
export interface AddCreditsInput {
  userId: string;
  credits: number;
  provider?: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  amountInr?: number;
}

export async function addCredits({
  userId,
  credits,
  provider = "manual",
  providerPaymentId,
  providerOrderId,
  amountInr,
}: AddCreditsInput): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.rpc("add_credits", {
    p_user_id: userId,
    p_credits: credits,
    p_provider: provider,
    p_provider_payment_id: providerPaymentId ?? null,
    p_provider_order_id: providerOrderId ?? null,
    p_amount_inr: amountInr ?? null,
  });
  if (error) {
    throw new Error(`Failed to add credits: ${error.message}`);
  }
}

// Sibling of addCredits() for a team's pool instead of an individual's
// balance — same idempotency guarantee (supabase/migrations/
// 0016_team_credits.sql's add_team_credits(), keyed on (provider,
// provider_payment_id)). userId is the paying team owner, recorded in
// payment_transactions for the audit trail (that table's user_id column
// stays NOT NULL — see 0016's comment on why this extends the existing
// table rather than a parallel one).
export interface AddTeamCreditsInput {
  teamId: string;
  userId: string;
  credits: number;
  provider?: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  amountInr?: number;
}

export async function addTeamCredits({
  teamId,
  userId,
  credits,
  provider = "manual",
  providerPaymentId,
  providerOrderId,
  amountInr,
}: AddTeamCreditsInput): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.rpc("add_team_credits", {
    p_team_id: teamId,
    p_user_id: userId,
    p_credits: credits,
    p_provider: provider,
    p_provider_payment_id: providerPaymentId ?? null,
    p_provider_order_id: providerOrderId ?? null,
    p_amount_inr: amountInr ?? null,
  });
  if (error) {
    throw new Error(`Failed to add team credits: ${error.message}`);
  }
}

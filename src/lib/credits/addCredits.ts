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

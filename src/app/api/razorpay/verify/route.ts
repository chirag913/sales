import { NextRequest, NextResponse } from "next/server";
// razorpay's own type declarations don't export this helper from the
// package root, only from this subpath — see node_modules/razorpay/dist/utils/razorpay-utils.d.ts.
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils";
import { addCredits } from "@/lib/credits/addCredits";
import { CREDIT_PACK_CALLS, CREDIT_PACK_PRICE_INR } from "@/lib/config/pricing";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const razorpayOrderId = body?.razorpayOrderId as string | undefined;
  const razorpayPaymentId = body?.razorpayPaymentId as string | undefined;
  const razorpaySignature = body?.razorpaySignature as string | undefined;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return NextResponse.json({ error: "Missing payment verification fields." }, { status: 400 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    console.error("razorpay/verify: RAZORPAY_KEY_SECRET is not set");
    return NextResponse.json({ error: "Payment verification is not configured." }, { status: 500 });
  }

  const isValid = validatePaymentVerification(
    { order_id: razorpayOrderId, payment_id: razorpayPaymentId },
    razorpaySignature,
    keySecret
  );

  if (!isValid) {
    console.error("razorpay/verify: signature mismatch", { userId, razorpayOrderId, razorpayPaymentId });
    return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 });
  }

  try {
    // Idempotent per (provider, providerPaymentId) — safe even if the
    // webhook already credited this same payment first.
    await addCredits({
      userId,
      credits: CREDIT_PACK_CALLS,
      provider: "razorpay",
      providerPaymentId: razorpayPaymentId,
      providerOrderId: razorpayOrderId,
      amountInr: CREDIT_PACK_PRICE_INR,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("razorpay/verify: addCredits failed", err);
    return NextResponse.json({ error: "Failed to add credits." }, { status: 500 });
  }
}

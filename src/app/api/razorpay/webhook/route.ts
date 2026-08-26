import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { addCredits } from "@/lib/credits/addCredits";
import { CREDIT_PACK_CALLS, CREDIT_PACK_PRICE_INR } from "@/lib/config/pricing";

// Called by Razorpay's servers, not the browser — there's no Supabase session
// here. Authenticity comes entirely from the X-Razorpay-Signature check
// below. This is the reliability backstop for /api/razorpay/verify: if the
// browser disappears right after a successful payment, this is what still
// grants the credits. addCredits() is idempotent per (provider,
// providerPaymentId), so it's always safe for both paths to fire.
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("razorpay/webhook: RAZORPAY_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
  }

  // Signature is computed over the exact raw bytes — must read as text
  // before any JSON parsing.
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature || !Razorpay.validateWebhookSignature(rawBody, signature, webhookSecret)) {
    console.error("razorpay/webhook: signature verification failed");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "payment.captured") {
    const payment = event.payload?.payment?.entity;
    const userId = payment?.notes?.userId as string | undefined;

    if (!userId) {
      console.error("razorpay/webhook: payment.captured with no userId in notes", payment?.id);
      return NextResponse.json({ ok: true }); // Acknowledge so Razorpay doesn't retry forever.
    }

    try {
      await addCredits({
        userId,
        credits: CREDIT_PACK_CALLS,
        provider: "razorpay",
        providerPaymentId: payment.id,
        providerOrderId: payment.order_id,
        amountInr: CREDIT_PACK_PRICE_INR,
      });
    } catch (err) {
      console.error("razorpay/webhook: addCredits failed", err);
      return NextResponse.json({ error: "Failed to add credits." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

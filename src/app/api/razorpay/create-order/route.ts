import { NextResponse } from "next/server";
import { CREDIT_PACK_CALLS, CREDIT_PACK_PRICE_INR } from "@/lib/config/pricing";
import { getRazorpayClient } from "@/lib/razorpay/client";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: CREDIT_PACK_PRICE_INR * 100, // paise
      currency: "INR",
      receipt: `credits_${userId.slice(0, 8)}_${Date.now()}`,
      notes: { userId, credits: String(CREDIT_PACK_CALLS) },
      // Without this, a successful payment only reaches "authorized" and the
      // money is never actually captured — it auto-voids after a few days.
      // We'd have granted credits for a charge that was never collected.
      payment_capture: true,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("razorpay/create-order failed", err);
    return NextResponse.json({ error: "Failed to create order." }, { status: 500 });
  }
}

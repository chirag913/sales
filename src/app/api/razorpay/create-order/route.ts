import { NextRequest, NextResponse } from "next/server";
import { CREDIT_PACK_CALLS, CREDIT_PACK_PRICE_INR } from "@/lib/config/pricing";
import { getRazorpayClient } from "@/lib/razorpay/client";
import { createClient } from "@/lib/supabase/server";

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 20;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const rawQuantity = body?.quantity;
  const quantity = typeof rawQuantity === "number" && Number.isInteger(rawQuantity) ? rawQuantity : 1;
  if (quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
    return NextResponse.json({ error: `quantity must be between ${MIN_QUANTITY} and ${MAX_QUANTITY}.` }, { status: 400 });
  }

  const teamId = typeof body?.teamId === "string" && body.teamId ? body.teamId : undefined;
  if (teamId) {
    // Real server-side authorization, not trusted from the client — only
    // the team's owner may buy credits into its pool.
    const { data: ownedTeam } = await supabase.from("teams").select("id").eq("id", teamId).eq("owner_id", userId).maybeSingle();
    if (!ownedTeam) {
      return NextResponse.json({ error: "not_authorized" }, { status: 403 });
    }
  }

  try {
    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: CREDIT_PACK_PRICE_INR * 100 * quantity, // paise
      currency: "INR",
      receipt: `credits_${userId.slice(0, 8)}_${Date.now()}`,
      // Notes are set once here and fetched back by /api/razorpay/verify
      // and the webhook as the authoritative source for what was actually
      // bought — never re-derived from anything the client sends after
      // this point. teamId is omitted entirely (not set to null) when
      // absent: Razorpay's notes values must be string|number, not null.
      notes: {
        userId,
        quantity: String(quantity),
        credits: String(CREDIT_PACK_CALLS * quantity),
        ...(teamId ? { teamId } : {}),
      },
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

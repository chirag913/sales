"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CREDIT_PACK_CALLS, CREDIT_PACK_PRICE_INR } from "@/lib/config/pricing";

interface RazorpayCheckoutInstance {
  open: () => void;
}

interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => RazorpayCheckoutInstance;
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  if (!scriptLoadPromise) {
    scriptLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load the checkout script."));
      document.body.appendChild(script);
    });
  }
  return scriptLoadPromise;
}

interface BuyCreditsButtonProps {
  onSuccess: () => void;
  variant?: "button" | "link";
  className?: string;
  label?: string;
}

export function BuyCreditsButton({ onSuccess, variant = "button", className, label: labelOverride }: BuyCreditsButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      await loadCheckoutScript();

      const orderRes = await fetch("/api/razorpay/create-order", { method: "POST" });
      if (!orderRes.ok) throw new Error("Failed to start checkout.");
      const order = (await orderRes.json()) as {
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
      };

      const result = await new Promise<{ completed: boolean }>((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: "BetterCallz",
          description: `${CREDIT_PACK_CALLS} practice calls`,
          handler: async (response: RazorpaySuccessResponse) => {
            try {
              const verifyRes = await fetch("/api/razorpay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              });
              if (!verifyRes.ok) throw new Error("Payment verification failed.");
              resolve({ completed: true });
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            // User closed the modal without paying — not an error, just no-op.
            ondismiss: () => resolve({ completed: false }),
          },
        });
        razorpay.open();
      });

      if (result.completed) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const label = loading ? "Please wait…" : (labelOverride ?? `Buy ${CREDIT_PACK_CALLS} calls — ₹${CREDIT_PACK_PRICE_INR}`);

  if (variant === "link") {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className={`underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
        >
          {label}
        </button>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </>
    );
  }

  return (
    <div>
      <Button
        onClick={handleClick}
        disabled={loading}
        className={`w-full justify-center px-6 py-3 text-base ${className ?? ""}`}
      >
        {label}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

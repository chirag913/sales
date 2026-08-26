import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function RefundPage() {
  return (
    <LegalPageLayout title="Refund Policy" updated="August 26, 2026">
      <h2>No refunds</h2>
      <p>
        All credit pack purchases on BetterCallz (a unit of Chirag Digital Pvt Ltd) are <strong>final and
        non-refundable</strong>. This applies regardless of how many credits you&apos;ve used, including if you
        haven&apos;t used any of them yet.
      </p>
      <p>
        Before purchasing, you can try the Service risk-free with your free trial calls &mdash; no card required. We
        recommend using your free trial to confirm the Service works for you before buying a credit pack.
      </p>

      <h2>Billing errors</h2>
      <p>
        The one exception is a genuine billing error on our end &mdash; for example, being charged twice for a single
        purchase. If you believe this happened, contact us within 7 days at{" "}
        <a href="mailto:hello@bettercallz.com" className="underline underline-offset-4">
          hello@bettercallz.com
        </a>{" "}
        with your payment reference, and we&apos;ll investigate and correct any confirmed error.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about a charge? Email{" "}
        <a href="mailto:hello@bettercallz.com" className="underline underline-offset-4">
          hello@bettercallz.com
        </a>
        .
      </p>
    </LegalPageLayout>
  );
}

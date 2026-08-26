import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" updated="August 26, 2026">
      <p>
        BetterCallz (&ldquo;BetterCallz&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a unit of Chirag Digital Pvt Ltd.
        This Privacy Policy explains what information we collect, how we use it, and who we share it with when you use
        the BetterCallz website and application.
      </p>

      <h2>1. Information we collect</h2>
      <p>
        <strong>Account information:</strong> your email address and password (stored securely by our authentication
        provider, Supabase).
      </p>
      <p>
        <strong>Practice call data:</strong> the training profile you describe (what you sell, who you target), the
        practice scenarios you use, your call transcripts, call audio processed in real time to generate the AI
        prospect&apos;s voice and responses, and the resulting scores and coaching feedback.
      </p>
      <p>
        <strong>Payment information:</strong> if you purchase credits, payment processing is handled entirely by
        Razorpay. We receive confirmation that a payment succeeded and a reference id &mdash; we do not receive or
        store your card details.
      </p>
      <p>
        <strong>Usage data:</strong> basic technical information such as call duration, timestamps, and which features
        you use, so we can operate and improve the Service.
      </p>

      <h2>2. How we use this information</h2>
      <ul>
        <li>To operate the Service &mdash; running practice calls, generating coaching and scores, and managing your account.</li>
        <li>To enforce free-trial and credit limits.</li>
        <li>To process payments and prevent fraud.</li>
        <li>To communicate with you about your account (e.g. email confirmation, important notices).</li>
        <li>To maintain and improve the Service&apos;s reliability and quality.</li>
      </ul>

      <h2>3. Who we share it with</h2>
      <p>We use a small number of service providers to run BetterCallz, each acting on our behalf:</p>
      <ul>
        <li>
          <strong>OpenAI</strong> &mdash; processes your call audio/text and training profile in real time to generate
          the AI prospect&apos;s responses, coaching, and scoring.
        </li>
        <li>
          <strong>Supabase</strong> &mdash; hosts our database and handles authentication.
        </li>
        <li>
          <strong>Razorpay</strong> &mdash; processes credit pack payments.
        </li>
      </ul>
      <p>We do not sell your personal information to third parties.</p>

      <h2>4. Data retention</h2>
      <p>
        We retain your account and call history for as long as your account is active, so you can review past calls
        and track progress. You can request deletion of your account and associated data at any time by contacting us.
      </p>

      <h2>5. Your rights</h2>
      <p>
        You can request access to, correction of, or deletion of your personal data by emailing{" "}
        <a href="mailto:hello@bettercallz.com" className="underline underline-offset-4">
          hello@bettercallz.com
        </a>
        .
      </p>

      <h2>6. Cookies</h2>
      <p>
        We use a session cookie to keep you signed in. We don&apos;t use advertising or third-party tracking cookies.
      </p>

      <h2>7. Children&apos;s privacy</h2>
      <p>BetterCallz is not directed at children under 18, and we do not knowingly collect data from them.</p>

      <h2>8. Changes to this policy</h2>
      <p>We may update this policy from time to time; the &ldquo;Last updated&rdquo; date above will reflect any changes.</p>

      <h2>9. Contact</h2>
      <p>
        Questions about this policy? Email{" "}
        <a href="mailto:hello@bettercallz.com" className="underline underline-offset-4">
          hello@bettercallz.com
        </a>
        .
      </p>
    </LegalPageLayout>
  );
}

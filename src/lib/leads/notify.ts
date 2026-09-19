import { MONTHLY_LEAD_OPTIONS } from "@/lib/leads/schema";
import type { StoredLead } from "@/lib/leads/deliver";

// Emails the team when a new landing-page lead has been STORED. Called from
// POST /api/leads after the database write succeeds, inside after(), so:
//   - it never runs for a lead that wasn't saved,
//   - it never delays the visitor's response,
//   - and it can never fail the submission: every failure is caught and logged
//     here. The row in landing_leads is the real record either way.
//
// Server-only. RESEND_API_KEY is never sent to the browser.
//
// Environment:
//   RESEND_API_KEY      required (unset = notifications are skipped, with a warning)
//   LEAD_NOTIFY_EMAIL   required: who to notify (comma-separated for several)
//   LEAD_NOTIFY_FROM    optional: the sender. Defaults to Resend's shared
//                       onboarding@resend.dev sender, which can only deliver to the
//                       Resend account owner's own address; use an address on a
//                       domain verified in Resend to notify anyone else.
//   RESEND_API_URL      optional: override the endpoint (used by tests to capture
//                       the request instead of sending real mail).

const DEFAULT_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "BetterCallz Leads <onboarding@resend.dev>";
const NOT_PROVIDED = "Not provided";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Team is in India: show the time the way they read it, not raw ISO.
function formatCreatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const formatted = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
    hour12: true,
  }).format(date);
  return `${formatted} IST`;
}

function monthlyLeadsLabel(value: string): string {
  const option = MONTHLY_LEAD_OPTIONS.find((o) => o.value === value);
  // The stored code exactly as submitted, plus the range it stands for.
  return option ? `${value} (${option.label})` : value;
}

interface Row {
  label: string;
  value: string;
}

export function buildLeadEmail(lead: StoredLead): { subject: string; text: string; html: string } {
  const rows: Row[] = [
    { label: "Name", value: lead.name },
    { label: "Business name", value: lead.businessName },
    { label: "Phone", value: lead.phone },
    { label: "WhatsApp", value: lead.whatsapp || NOT_PROVIDED },
    { label: "What they sell", value: lead.whatTheySell },
    { label: "Monthly leads", value: monthlyLeadsLabel(lead.monthlyLeads) },
    { label: "Lead sources", value: lead.leadSources.length > 0 ? lead.leadSources.join(", ") : NOT_PROVIDED },
    { label: "Intent", value: lead.intent },
    { label: "Submitted", value: formatCreatedAt(lead.createdAt) },
  ];

  // The name is user-supplied and cleanText() has already stripped control
  // characters and newlines, so it can't inject extra mail headers.
  const subject = `New BetterCallz lead — ${lead.businessName}`;

  const text = rows.map((r) => `${r.label}: ${r.value}`).join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#18181b;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;">
      <tr>
        <td style="padding:20px 24px;border-bottom:1px solid #e4e4e7;">
          <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;">New lead</div>
          <div style="font-size:18px;font-weight:600;margin-top:4px;">${escapeHtml(lead.businessName)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 24px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
${rows
  .map(
    (r) => `            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;width:150px;vertical-align:top;font-size:13px;color:#71717a;">${escapeHtml(r.label)}</td>
              <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;vertical-align:top;font-size:14px;">${escapeHtml(r.value)}</td>
            </tr>`
  )
  .join("\n")}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

export async function notifyNewLead(lead: StoredLead): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = (process.env.LEAD_NOTIFY_EMAIL ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);

  if (!apiKey || recipients.length === 0) {
    console.warn("leads/notify: skipped, RESEND_API_KEY and LEAD_NOTIFY_EMAIL must both be set");
    return;
  }

  try {
    const { subject, text, html } = buildLeadEmail(lead);
    const res = await fetch(process.env.RESEND_API_URL || DEFAULT_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.LEAD_NOTIFY_FROM || DEFAULT_FROM,
        to: recipients,
        subject,
        text,
        html,
      }),
      // A slow provider must not hold this invocation open.
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      // Never log the request (it carries the key); the provider's error body is safe.
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      console.error(`leads/notify: Resend rejected the email for lead ${lead.id} (HTTP ${res.status}) ${detail}`);
      return;
    }
    const body = (await res.json().catch(() => null)) as { id?: string } | null;
    console.log(`leads/notify: email sent for lead ${lead.id}${body?.id ? ` (Resend id ${body.id})` : ""}`);
  } catch (err) {
    console.error(`leads/notify: sending failed for lead ${lead.id}`, err instanceof Error ? err.message : err);
  }
}

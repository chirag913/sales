import { LeadInput } from "@/lib/leads/schema";

// INTEGRATION POINT for getting a stored lead in front of the team.
//
// The lead is already saved in `landing_leads` before this runs, so nothing
// here can lose a lead. Today it does one optional thing: if LEAD_WEBHOOK_URL
// is set, POST the lead there as JSON. That is enough to connect, without new
// code, any of:
//   - a Google Apps Script web app that appends a row to a Google Sheet
//   - a Zapier / Make / n8n webhook (Sheets, Slack, email, a CRM)
//   - a small internal endpoint
// LEAD_WEBHOOK_SECRET, if set, is sent as a Bearer token so the receiver can
// reject anyone else. Neither variable is required, and neither is exposed to
// the browser.
//
// Later phases plug in here too (still server-side only): starting the
// BetterCallz AI qualifier call, and sending the WhatsApp follow-up. Both need
// the number stored in `phone` / `whatsapp`, the `intent`, and consent (see
// `contact_consent_at`). Neither is implemented in this repository.

export interface StoredLead extends LeadInput {
  id: string;
  createdAt: string;
  sourcePage: string | null;
  utm: Record<string, string>;
}

// Spreadsheets treat a leading = + - @ as a formula. Prefixing an apostrophe
// stops a visitor from planting a formula in the team's sheet.
function sheetSafe(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export async function deliverLead(lead: StoredLead): Promise<void> {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) return;

  const secret = process.env.LEAD_WEBHOOK_SECRET;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(secret ? { Authorization: `Bearer ${secret}` } : {}) },
      body: JSON.stringify({
        id: lead.id,
        created_at: lead.createdAt,
        intent: lead.intent,
        name: sheetSafe(lead.name),
        business_name: sheetSafe(lead.businessName),
        phone: lead.phone,
        whatsapp: lead.whatsapp ?? "",
        what_they_sell: sheetSafe(lead.whatTheySell),
        monthly_leads: lead.monthlyLeads,
        lead_sources: lead.leadSources.join(", "),
        source_page: lead.sourcePage,
        utm: lead.utm,
      }),
      // A slow receiver must not pile up work on this server.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("leads/deliver: webhook responded", res.status);
  } catch (err) {
    console.error("leads/deliver: webhook failed", err);
  }
}

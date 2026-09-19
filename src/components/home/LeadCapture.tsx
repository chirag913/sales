"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Section, SectionHeading } from "@/components/home/parts";
import { Button } from "@/components/ui/Button";
import { trackEvent } from "@/lib/analytics";
import {
  LEAD_SOURCE_OPTIONS,
  LeadErrors,
  LeadField,
  LeadIntent,
  LeadSource,
  LIMITS,
  MONTHLY_LEAD_OPTIONS,
  validateLeadInput,
} from "@/lib/leads/schema";

// The page's main conversion point. Submitting stores the lead (see
// /api/leads) and shows a confirmation. It does NOT place a call, schedule
// anything, or contact any external calling system: the wording of each
// confirmation says exactly what happens, which is that the team follows up.

const FIELD =
  "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 transition-colors focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 aria-[invalid=true]:border-red-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-teal-400 dark:focus:ring-teal-400/20 disabled:cursor-not-allowed disabled:opacity-50";

const INTENT_OPTIONS: { value: LeadIntent; title: string; description: string; submit: string }[] = [
  {
    value: "custom_demo_requested",
    title: "Get a Custom AI Call",
    description:
      "We'll create a call tailored to your business so you can experience how the conversation could work.",
    submit: "Request my custom AI call",
  },
  {
    value: "talk_to_team",
    title: "Talk to the Team",
    description: "Submit your details and our team will get in touch.",
    submit: "Talk to the team",
  },
];

const CONFIRMATION: Record<LeadIntent, { title: string; text: string }> = {
  custom_demo_requested: {
    title: "You're on the list.",
    text: "We'll prepare a custom experience around your business and get back to you.",
  },
  talk_to_team: {
    title: "Got it.",
    text: "We have your details. Our team will get in touch.",
  },
};

interface Values {
  name: string;
  businessName: string;
  phone: string;
  whatsapp: string;
  whatTheySell: string;
  monthlyLeads: string;
  leadSources: LeadSource[];
  intent: LeadIntent | "";
  hp: string;
}

const EMPTY: Values = {
  name: "",
  businessName: "",
  phone: "",
  whatsapp: "",
  whatTheySell: "",
  monthlyLeads: "",
  leadSources: [],
  intent: "",
  hp: "",
};

// Order used to move focus to the first invalid field.
const FOCUS_ORDER: { field: LeadField; id: string }[] = [
  { field: "name", id: "lead-name" },
  { field: "businessName", id: "lead-business" },
  { field: "phone", id: "lead-phone" },
  { field: "whatsapp", id: "lead-whatsapp" },
  { field: "whatTheySell", id: "lead-sells" },
  { field: "monthlyLeads", id: "lead-volume" },
  { field: "leadSources", id: "lead-source-meta_ads" },
  { field: "intent", id: "lead-intent-custom_demo_requested" },
];

function readUtm(): Record<string, string> {
  const out: Record<string, string> = {};
  const params = new URLSearchParams(window.location.search);
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const value = params.get(key);
    if (value) out[key] = value.slice(0, 100);
  }
  return out;
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: (describedBy: string | undefined) => ReactNode;
}

function Field({ id, label, error, hint, optional, children }: FieldProps) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {label}
        {optional && <span className="ml-1.5 font-normal text-zinc-500 dark:text-zinc-400">(optional)</span>}
      </label>
      {children(describedBy)}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-zinc-500 dark:text-zinc-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function LeadCapture() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<LeadErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<LeadIntent | null>(null);
  const openedAt = useRef(0);
  const started = useRef(false);
  const confirmationRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (done) confirmationRef.current?.focus();
  }, [done]);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (key !== "hp" && errors[key as LeadField]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function toggleSource(source: LeadSource) {
    set(
      "leadSources",
      values.leadSources.includes(source) ? values.leadSources.filter((s) => s !== source) : [...values.leadSources, source]
    );
  }

  function focusFirstError(found: LeadErrors) {
    const first = FOCUS_ORDER.find(({ field }) => found[field]);
    if (first) document.getElementById(first.id)?.focus();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setServerError(null);

    const local = validateLeadInput({ ...values, intent: values.intent || undefined });
    if (!local.ok) {
      setErrors(local.errors);
      focusFirstError(local.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          openedAt: openedAt.current,
          sourcePage: window.location.pathname,
          utm: readUtm(),
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string; errors?: LeadErrors } | null;

      if (res.ok) {
        trackEvent(local.data.intent === "custom_demo_requested" ? "custom_demo_requested" : "talk_to_team_requested");
        setDone(local.data.intent);
        return;
      }
      if (res.status === 400 && body?.errors) {
        setErrors(body.errors);
        focusFirstError(body.errors);
        return;
      }
      setServerError(body?.error ?? "Something went wrong. Please try again.");
    } catch {
      setServerError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel = INTENT_OPTIONS.find((o) => o.value === values.intent)?.submit ?? "Continue";

  return (
    <Section id="get-started">
      <div className="mx-auto max-w-3xl">
        <SectionHeading
          eyebrow="Get started"
          title="See what BetterCallz would sound like for your business."
          description="Tell us a little about your business. We'll use it to understand where BetterCallz could fit into your lead flow."
        />

        <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
          {done ? (
            <div role="status" className="py-8 text-center sm:py-12">
              <span
                aria-hidden
                className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-white dark:bg-teal-400 dark:text-zinc-950"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 5 5L20 7" />
                </svg>
              </span>
              <h3
                ref={confirmationRef}
                tabIndex={-1}
                className="mt-5 text-2xl font-semibold tracking-tight text-zinc-900 outline-none dark:text-zinc-50"
              >
                {CONFIRMATION[done].title}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-zinc-500 dark:text-zinc-400">{CONFIRMATION[done].text}</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              onFocusCapture={() => {
                if (!started.current) {
                  started.current = true;
                  trackEvent("custom_demo_form_started");
                }
              }}
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field id="lead-name" label="Name" error={errors.name}>
                  {(d) => (
                    <input
                      id="lead-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      maxLength={LIMITS.name.max}
                      value={values.name}
                      onChange={(e) => set("name", e.target.value)}
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={d}
                      className={FIELD}
                    />
                  )}
                </Field>
                <Field id="lead-business" label="Business name" error={errors.businessName}>
                  {(d) => (
                    <input
                      id="lead-business"
                      name="organization"
                      type="text"
                      autoComplete="organization"
                      maxLength={LIMITS.business.max}
                      value={values.businessName}
                      onChange={(e) => set("businessName", e.target.value)}
                      aria-invalid={Boolean(errors.businessName)}
                      aria-describedby={d}
                      className={FIELD}
                    />
                  )}
                </Field>
                <Field id="lead-phone" label="Phone / WhatsApp" error={errors.phone} hint="We'll only use this to reach you about your request.">
                  {(d) => (
                    <input
                      id="lead-phone"
                      name="tel"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="98765 43210"
                      maxLength={30}
                      value={values.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby={d}
                      className={FIELD}
                    />
                  )}
                </Field>
                <Field id="lead-whatsapp" label="WhatsApp number" optional error={errors.whatsapp} hint="Only if it's different from your phone number.">
                  {(d) => (
                    <input
                      id="lead-whatsapp"
                      name="whatsapp"
                      type="tel"
                      inputMode="tel"
                      autoComplete="off"
                      maxLength={30}
                      value={values.whatsapp}
                      onChange={(e) => set("whatsapp", e.target.value)}
                      aria-invalid={Boolean(errors.whatsapp)}
                      aria-describedby={d}
                      className={FIELD}
                    />
                  )}
                </Field>
                <div className="sm:col-span-2">
                  <Field id="lead-sells" label="What does your business sell?" error={errors.whatTheySell}>
                    {(d) => (
                      <input
                        id="lead-sells"
                        name="what-they-sell"
                        type="text"
                        placeholder="e.g. Residential apartments in Pune"
                        maxLength={LIMITS.sells.max}
                        value={values.whatTheySell}
                        onChange={(e) => set("whatTheySell", e.target.value)}
                        aria-invalid={Boolean(errors.whatTheySell)}
                        aria-describedby={d}
                        className={FIELD}
                      />
                    )}
                  </Field>
                </div>
                <div className="sm:col-span-2">
                <Field id="lead-volume" label="Approximate leads per month" error={errors.monthlyLeads}>
                  {(d) => (
                    <select
                      id="lead-volume"
                      name="monthly-leads"
                      value={values.monthlyLeads}
                      onChange={(e) => set("monthlyLeads", e.target.value)}
                      aria-invalid={Boolean(errors.monthlyLeads)}
                      aria-describedby={d}
                      className={FIELD}
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      {MONTHLY_LEAD_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                </div>
              </div>

              <fieldset className="mt-6" aria-describedby={errors.leadSources ? "lead-sources-error" : undefined}>
                <legend className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Where do your leads come from?
                  <span className="ml-1.5 font-normal text-zinc-500 dark:text-zinc-400">(optional, choose any)</span>
                </legend>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {LEAD_SOURCE_OPTIONS.map((o) => {
                    const checked = values.leadSources.includes(o.value);
                    return (
                      <label
                        key={o.value}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-600/40 ${
                          checked
                            ? "border-teal-600 bg-teal-50 text-teal-900 dark:border-teal-400 dark:bg-teal-400/10 dark:text-teal-100"
                            : "border-zinc-200 text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        <input
                          id={`lead-source-${o.value}`}
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => toggleSource(o.value)}
                        />
                        {o.label}
                      </label>
                    );
                  })}
                </div>
                {errors.leadSources && (
                  <p id="lead-sources-error" className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {errors.leadSources}
                  </p>
                )}
              </fieldset>

              <fieldset className="mt-8" aria-describedby={errors.intent ? "lead-intent-error" : undefined}>
                <legend className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                  How would you like to continue?
                </legend>
                <div role="radiogroup" className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {INTENT_OPTIONS.map((o) => {
                    const selected = values.intent === o.value;
                    return (
                      <label
                        key={o.value}
                        className={`flex cursor-pointer gap-3.5 rounded-xl border p-5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-600/40 ${
                          selected
                            ? "border-teal-600 bg-teal-50/60 ring-1 ring-teal-600 dark:border-teal-400 dark:bg-teal-400/5 dark:ring-teal-400"
                            : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                        }`}
                      >
                        <input
                          id={`lead-intent-${o.value}`}
                          type="radio"
                          name="intent"
                          value={o.value}
                          className="sr-only"
                          checked={selected}
                          onChange={() => set("intent", o.value)}
                        />
                        <span
                          aria-hidden
                          className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${
                            selected ? "border-teal-600 dark:border-teal-400" : "border-zinc-300 dark:border-zinc-700"
                          }`}
                        >
                          {selected && <span className="h-2 w-2 rounded-full bg-teal-600 dark:bg-teal-400" />}
                        </span>
                        <span>
                          <span className="block text-base font-semibold text-zinc-900 dark:text-zinc-50">{o.title}</span>
                          <span className="mt-1 block text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{o.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {errors.intent && (
                  <p id="lead-intent-error" className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {errors.intent}
                  </p>
                )}
              </fieldset>

              {/* Honeypot: invisible to people and assistive tech; bots that fill it are ignored server-side. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  Leave this field empty
                  <input
                    type="text"
                    name="hp"
                    tabIndex={-1}
                    autoComplete="off"
                    value={values.hp}
                    onChange={(e) => set("hp", e.target.value)}
                  />
                </label>
              </div>

              {serverError && (
                <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  {serverError}
                </p>
              )}

              <div className="mt-8 flex flex-col items-start gap-4">
                <Button type="submit" disabled={submitting} className="w-full px-6 py-3 text-base sm:w-auto">
                  {submitting ? "Sending…" : submitLabel}
                </Button>
                <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  By submitting, you agree that BetterCallz may contact you by phone or WhatsApp about this request. See our{" "}
                  <Link href="/privacy" className="underline underline-offset-4 hover:text-zinc-700 dark:hover:text-zinc-300">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </Section>
  );
}

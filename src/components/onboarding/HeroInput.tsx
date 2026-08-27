"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PROSPECT_MARKET_OPTIONS, ProspectMarket } from "@/lib/types";

export interface HeroInputValue {
  description: string;
  context: string;
  market: ProspectMarket;
}

interface HeroInputProps {
  onSubmit: (input: HeroInputValue) => void;
  loading: boolean;
  error: string | null;
}

const textareaClasses =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus:border-zinc-100 dark:focus:ring-zinc-100";

const DEFAULT_DESCRIPTION = "I want to cold call ";

export function HeroInput({ onSubmit, loading, error }: HeroInputProps) {
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const [context, setContext] = useState("");
  const [market, setMarket] = useState<ProspectMarket>("US");
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!description.trim() || loading) return;
    onSubmit({ description: description.trim(), context: context.trim(), market });
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-balance text-zinc-900 dark:text-zinc-50 sm:text-5xl">
        Practice selling better.
      </h1>
      <p className="mt-4 max-w-lg text-lg text-zinc-500 dark:text-zinc-400">
        Tell me what you&apos;re selling and who you&apos;re trying to reach. I&apos;ll build your training
        environment.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 w-full text-left">
        <textarea
          ref={descriptionRef}
          className={`${textareaClasses} text-base`}
          rows={3}
          placeholder="I want to cold call US businesses to sell commercial cleaning services."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Anything else I should know? <span className="font-normal text-zinc-400 dark:text-zinc-600">(optional)</span>
          </label>
          <textarea
            className={`${textareaClasses} text-sm`}
            rows={2}
            placeholder="We're based in India and want to book onsite walkthroughs."
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Prospect market</span>
          {PROSPECT_MARKET_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMarket(opt.value)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                market === opt.value
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-8 flex justify-center">
          <Button type="submit" disabled={!description.trim() || loading} className="gap-2 px-6 py-3 text-base">
            {loading ? (
              "Building your training…"
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden />
                Build My Training
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

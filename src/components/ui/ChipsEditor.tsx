"use client";

import { useState } from "react";

interface ChipsEditorProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function ChipsEditor({ values, onChange, placeholder }: ChipsEditorProps) {
  const [draft, setDraft] = useState("");

  function addChip() {
    const trimmed = draft.trim();
    if (!trimmed || values.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...values, trimmed]);
    setDraft("");
  }

  function removeChip(chip: string) {
    onChange(values.filter((v) => v !== chip));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 py-1 pl-3 pr-1.5 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {v}
            <button
              type="button"
              onClick={() => removeChip(v)}
              className="flex h-4 w-4 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addChip();
            }
          }}
          placeholder={placeholder ?? "Add and press Enter"}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
        />
        <button
          type="button"
          onClick={addChip}
          className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Add
        </button>
      </div>
    </div>
  );
}

"use client";

import { INPUT_CLASSES } from "@/components/ui/inputClasses";

interface Option {
  value: string;
  label: string;
}

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "textarea" | "select";
  options?: Option[];
  hint?: string;
  disabled?: boolean;
  prefix?: string;
}

export function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  options,
  hint,
  disabled,
  prefix,
}: FormFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {type === "textarea" ? (
        <textarea
          className={`${INPUT_CLASSES} min-h-[80px] resize-y`}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      ) : type === "select" ? (
        <select className={INPUT_CLASSES} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : prefix ? (
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-500 dark:text-zinc-400">
            {prefix}
          </span>
          <input
            className={`${INPUT_CLASSES} pl-6`}
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      ) : (
        <input
          className={INPUT_CLASSES}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )}
      {hint && <span className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>}
    </label>
  );
}

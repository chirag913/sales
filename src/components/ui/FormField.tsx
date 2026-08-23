"use client";

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

const inputClasses =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100 disabled:cursor-not-allowed disabled:opacity-50";

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
          className={`${inputClasses} min-h-[80px] resize-y`}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      ) : type === "select" ? (
        <select className={inputClasses} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
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
            className={`${inputClasses} pl-6`}
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      ) : (
        <input
          className={inputClasses}
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

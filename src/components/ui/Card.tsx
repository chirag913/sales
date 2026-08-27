import { ComponentType, ReactNode } from "react";
import { AssumptionBadge } from "@/components/ui/AssumptionBadge";

interface CardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  assumption?: boolean;
  children: ReactNode;
}

export function Card({ icon: Icon, title, assumption, children }: CardProps) {
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          <Icon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" aria-hidden />
          {title}
        </h3>
        {assumption && <AssumptionBadge />}
      </div>
      {children}
    </div>
  );
}

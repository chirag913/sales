import { ReactNode } from "react";
import { AssumptionBadge } from "@/components/ui/AssumptionBadge";

interface CardProps {
  icon: string;
  title: string;
  assumption?: boolean;
  children: ReactNode;
}

export function Card({ icon, title, assumption, children }: CardProps) {
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          <span aria-hidden>{icon}</span>
          {title}
        </h3>
        {assumption && <AssumptionBadge />}
      </div>
      {children}
    </div>
  );
}

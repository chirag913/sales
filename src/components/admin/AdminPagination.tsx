import Link from "next/link";

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  basePath: string;
}

export function AdminPagination({ page, totalPages, basePath }: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between text-sm">
      <Link
        href={`${basePath}?page=${Math.max(1, page - 1)}`}
        className={
          page <= 1
            ? "pointer-events-none text-zinc-300 dark:text-zinc-700"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        }
      >
        ← Previous
      </Link>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        Page {page} of {totalPages}
      </span>
      <Link
        href={`${basePath}?page=${Math.min(totalPages, page + 1)}`}
        className={
          page >= totalPages
            ? "pointer-events-none text-zinc-300 dark:text-zinc-700"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        }
      >
        Next →
      </Link>
    </div>
  );
}

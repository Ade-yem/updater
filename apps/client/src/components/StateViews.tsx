import type { ReactNode } from 'react';
import { AlertCircleIcon, InboxIcon } from './icons';

export function DigestSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading digest">
      <div className="h-4 w-1/3 animate-pulse rounded bg-ink-200 dark:bg-ink-800" />
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-ink-200 dark:bg-ink-800" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-ink-200 dark:bg-ink-800" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-ink-200 dark:bg-ink-800" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-20 animate-pulse rounded-lg bg-ink-200 dark:bg-ink-800" />
        <div className="h-20 animate-pulse rounded-lg bg-ink-200 dark:bg-ink-800" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg bg-ink-200 dark:bg-ink-800" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div role="status" className="rounded-lg border border-dashed border-ink-300 py-12 text-center dark:border-ink-700">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-ink-400 dark:bg-ink-800">
        {icon ?? <InboxIcon className="h-5 w-5" />}
      </div>
      <h3 className="text-sm font-medium text-ink-800 dark:text-ink-200">{title}</h3>
      {description && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{description}</p>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-lg border border-status-failed/20 bg-status-failed-bg px-4 py-6 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/60 text-status-failed">
        <AlertCircleIcon className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-status-failed">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-status-failed shadow-sm hover:bg-white/80"
        >
          Try again
        </button>
      )}
    </div>
  );
}

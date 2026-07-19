import { useEffect } from 'react';
import { useDigest } from '../hooks/useDigest';
import { DigestCard } from '../components/DigestCard';
import { EmptyState, ErrorState, ListSkeleton } from '../components/StateViews';
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons';

export function DigestHistoryPage() {
  const { history, fetchHistory } = useDigest();
  const { items, total, skip, take, isLoading, error } = history;

  useEffect(() => {
    fetchHistory({ skip: 0, take });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const page = Math.floor(skip / take) + 1;
  const pageCount = Math.max(1, Math.ceil(total / take));
  const canGoPrevious = skip > 0;
  const canGoNext = skip + take < total;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">Digest history</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400">Past daily summaries, newest first.</p>
      </div>

      {isLoading && items.length === 0 && <ListSkeleton />}

      {error && <ErrorState message={error} onRetry={() => fetchHistory({ skip, take })} />}

      {!error && !isLoading && items.length === 0 && (
        <EmptyState title="No digests yet" description="Once digests start generating, they’ll show up here." />
      )}

      {items.length > 0 && (
        <>
          <ul className="space-y-3">
            {items.map((digest) => (
              <DigestCard key={digest.id} digest={digest} />
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              disabled={!canGoPrevious || isLoading}
              onClick={() => fetchHistory({ skip: Math.max(0, skip - take), take })}
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-ink-300 dark:hover:bg-ink-800"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Previous
            </button>
            <span className="text-xs text-ink-400">
              Page {page} of {pageCount}
            </span>
            <button
              type="button"
              disabled={!canGoNext || isLoading}
              onClick={() => fetchHistory({ skip: skip + take, take })}
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-ink-300 dark:hover:bg-ink-800"
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { DigestDto } from '@repo/shared';
import { ApiError, digestApi, toDate } from '../lib/api';
import { DigestSummary } from '../components/DigestSummary';
import { LinkSummaryCard } from '../components/LinkSummaryCard';
import { StatusBadge } from '../components/StatusBadge';
import { DigestSkeleton, EmptyState, ErrorState } from '../components/StateViews';
import { ChevronLeftIcon } from '../components/icons';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export function DigestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [digest, setDigest] = useState<DigestDto | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      setDigest(undefined);
      setError(null);
      try {
        const result = await digestApi.getById(id);
        if (!cancelled) setDigest(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load this digest.');
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div>
      <Link
        to="/digest/history"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-ink-900 dark:text-ink-300 dark:hover:text-ink-100"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Back to history
      </Link>

      {digest === undefined && !error && <DigestSkeleton />}

      {error && <ErrorState message={error} />}

      {digest && (
        <div className="space-y-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-lg font-semibold tracking-tight">{dateFormatter.format(toDate(digest.digestDate))}</h1>
            <StatusBadge status={digest.status} />
          </div>

          {digest.status === 'completed' && <DigestSummary markdown={digest.summaryMarkdown} />}

          {digest.status === 'failed' && (
            <ErrorState message="Digest generation failed for this day." />
          )}

          {digest.status === 'no_emails' && <EmptyState title="No emails that day" />}

          {digest.status === 'completed' && digest.linksProcessed.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-ink-700 dark:text-ink-300">
                Links mentioned ({digest.linksProcessed.length})
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {digest.linksProcessed.map((link) => (
                  <LinkSummaryCard key={link.url} link={link} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

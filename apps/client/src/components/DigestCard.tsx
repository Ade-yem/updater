import type { DigestDto } from '@repo/shared';
import { Link } from 'react-router-dom';
import { toDate } from '../lib/api';
import { stripMarkdown, truncate } from '../lib/text';
import { StatusBadge } from './StatusBadge';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function DigestCard({ digest }: { digest: DigestDto }) {
  const snippet = digest.status === 'completed' ? truncate(stripMarkdown(digest.summaryMarkdown), 160) : null;

  return (
    <li>
      <Link
        to={`/digest/history/${digest.id}`}
        className="block rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-ink-700"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-ink-900 dark:text-ink-100">
            {dateFormatter.format(toDate(digest.digestDate))}
          </span>
          <StatusBadge status={digest.status} />
        </div>
        {snippet && <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{snippet}</p>}
      </Link>
    </li>
  );
}

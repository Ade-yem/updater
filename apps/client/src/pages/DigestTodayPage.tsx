import { useDigest } from '../hooks/useDigest';
import { toDate } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { DigestSummary } from '../components/DigestSummary';
import { DigestSkeleton, EmptyState, ErrorState } from '../components/StateViews';
import { ClockIcon, RefreshIcon } from '../components/icons';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

export function DigestTodayPage() {
  const { today, todayError, refreshToday, triggerRefresh, isRefreshing, liveStatus } = useDigest();

  const headerDate = today ? toDate(today.digestDate) : new Date();
  const isBusy = isRefreshing || liveStatus === 'processing';

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Today’s digest</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">{dateFormatter.format(headerDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={liveStatus} />
          <button
            type="button"
            onClick={() => triggerRefresh().catch(() => {})}
            disabled={isBusy}
            aria-label={isBusy ? 'Digest generation in progress' : 'Generate digest now'}
            title={isBusy ? 'Generating…' : 'Generate digest now'}
            className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100"
          >
            <RefreshIcon className={`h-4 w-4 ${isBusy ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {today === undefined && !todayError && <DigestSkeleton />}

      {todayError && <ErrorState message={todayError} onRetry={refreshToday} />}

      {today === null && !todayError && (
        <EmptyState
          icon={<ClockIcon className="h-5 w-5" />}
          title={liveStatus === 'processing' ? 'Generating today’s digest…' : 'No digest yet'}
          description={
            liveStatus === 'processing'
              ? 'Reading your emails and following any links — this usually takes under a minute.'
              : 'Your digest is generated automatically once a day. Check back after your scheduled time.'
          }
        />
      )}

      {today && today.status === 'processing' && (
        <EmptyState
          icon={<ClockIcon className="h-5 w-5 animate-spin" />}
          title="Generating today’s digest…"
          description="Reading your emails and following any links — this usually takes under a minute."
        />
      )}

      {today && today.status === 'failed' && (
        <ErrorState message="Digest generation failed for today. It will try again tomorrow." onRetry={refreshToday} />
      )}

      {today && today.status === 'no_emails' && (
        <EmptyState title="No emails today" description="Nothing came in for the digest window today." />
      )}

      {today && today.status === 'completed' && (
        <div className="space-y-8">
          <DigestSummary markdown={today.summaryMarkdown} />
        </div>
      )}
    </div>
  );
}

import type { LiveStatus } from '../contexts/digest-context';
import { AlertCircleIcon, CheckCircleIcon, ClockIcon, InboxIcon } from './icons';

const CONFIG: Record<LiveStatus, { label: string; className: string; Icon: typeof ClockIcon }> = {
  idle: {
    label: 'Waiting for today’s run',
    className: 'bg-status-empty-bg text-status-empty',
    Icon: ClockIcon,
  },
  processing: {
    label: 'Processing…',
    className: 'bg-status-processing-bg text-status-processing',
    Icon: ClockIcon,
  },
  completed: {
    label: 'Ready',
    className: 'bg-status-completed-bg text-status-completed',
    Icon: CheckCircleIcon,
  },
  failed: {
    label: 'Failed',
    className: 'bg-status-failed-bg text-status-failed',
    Icon: AlertCircleIcon,
  },
  no_emails: {
    label: 'No emails today',
    className: 'bg-status-empty-bg text-status-empty',
    Icon: InboxIcon,
  },
};

export function StatusBadge({ status }: { status: LiveStatus }) {
  const { label, className, Icon } = CONFIG[status];
  const isProcessing = status === 'processing';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      <Icon className={`h-3.5 w-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
}

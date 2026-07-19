import type { LinkSummary } from '@repo/shared';
import { useState } from 'react';
import { ExternalLinkIcon, LinkIcon } from './icons';

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function LinkSummaryCard({ link }: { link: LinkSummary }) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const hostname = hostnameOf(link.url);

  return (
    <li className="rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-ink-700">
      <a href={link.url} target="_blank" rel="noreferrer noopener" className="group flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-ink-100 dark:bg-ink-800">
          {faviconFailed ? (
            <LinkIcon className="h-3.5 w-3.5 text-ink-400" />
          ) : (
            <img
              src={`https://www.google.com/s2/favicons?sz=32&domain=${hostname}`}
              alt=""
              className="h-3.5 w-3.5"
              onError={() => setFaviconFailed(true)}
            />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-ink-900 group-hover:text-accent-700 dark:text-ink-100 dark:group-hover:text-accent-400">
              {link.title || hostname}
            </span>
            <ExternalLinkIcon className="h-3 w-3 shrink-0 text-ink-400" />
          </span>
          <span className="block truncate text-xs text-ink-400">{hostname}</span>

          {link.keyPoints && link.keyPoints.length > 0 && (
            <ul className="mt-2 space-y-1">
              {link.keyPoints.map((point, i) => (
                <li key={i} className="flex gap-1.5 text-sm text-ink-600 dark:text-ink-300">
                  <span aria-hidden className="text-ink-300 dark:text-ink-600">
                    –
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
        </span>
      </a>
    </li>
  );
}

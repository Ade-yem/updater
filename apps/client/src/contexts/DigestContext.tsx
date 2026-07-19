import type { DigestDto, SSEEvent } from '@repo/shared';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { digestApi, type DigestListParams } from '../lib/api';
import { connectToDigestStream } from '../lib/sse';
import { useAuth } from '../hooks/useAuth';
import { useVoiceAnnouncements } from '../hooks/useVoiceAnnouncements';
import { useNotifications } from '../hooks/useNotifications';
import { DigestContext, type HistoryState, type LiveStatus } from './digest-context';

const POLL_INTERVAL_MS = 10_000;
const HISTORY_PAGE_SIZE = 10;

export function DigestProvider({ children }: { children: ReactNode }) {
  const { token, status: authStatus } = useAuth();
  const voice = useVoiceAnnouncements();
  const push = useNotifications();

  const [today, setToday] = useState<DigestDto | null | undefined>(undefined);
  const [todayError, setTodayError] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('idle');
  const [liveError, setLiveError] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);

  const [history, setHistory] = useState<HistoryState>({
    items: [],
    total: 0,
    skip: 0,
    take: HISTORY_PAGE_SIZE,
    isLoading: false,
    error: null,
  });

  const refreshToday = useCallback(async () => {
    try {
      const digest = await digestApi.getToday();
      setToday(digest);
      setTodayError(null);
      if (digest) {
        setLiveStatus(digest.status === 'processing' ? 'processing' : (digest.status as LiveStatus));
      }
    } catch (err) {
      setTodayError(err instanceof Error ? err.message : 'Failed to load today’s digest.');
    }
  }, []);

  const fetchHistory = useCallback(async (params: DigestListParams = {}) => {
    setHistory((prev) => {
      const skip = params.skip ?? prev.skip;
      const take = params.take ?? prev.take;

      digestApi
        .list({ ...params, skip, take })
        .then((result) => {
          setHistory({ items: result.items, total: result.total, skip, take, isLoading: false, error: null });
        })
        .catch((err) => {
          setHistory((current) => ({
            ...current,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to load digest history.',
          }));
        });

      return { ...prev, skip, take, isLoading: true, error: null };
    });
  }, []);

  // Initial + polling fetch of today's digest while authenticated.
  useEffect(() => {
    if (authStatus !== 'authenticated') return;

    const poll = () => {
      refreshToday();
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [authStatus, refreshToday]);

  // SSE connection with capped exponential backoff reconnect.
  const retryDelayRef = useRef(1000);
  useEffect(() => {
    if (authStatus !== 'authenticated' || !token) return;

    let disconnect: (() => void) | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const handleEvent = (event: SSEEvent) => {
      retryDelayRef.current = 1000;
      switch (event.type) {
        case 'digest.started':
          setLiveStatus('processing');
          setLiveError(null);
          break;
        case 'digest.no_emails':
          setLiveStatus('no_emails');
          break;
        case 'digest.completed':
          setLiveStatus('completed');
          refreshToday();
          voice.speak('Your digest is ready.');
          break;
        case 'digest.failed':
          setLiveStatus('failed');
          setLiveError(event.error ?? 'Digest generation failed.');
          break;
      }
    };

    const connect = () => {
      if (cancelled) return;
      disconnect = connectToDigestStream(
        token,
        handleEvent,
        () => {
          setSseConnected(false);
          disconnect?.();
          if (cancelled) return;
          retryTimer = setTimeout(connect, retryDelayRef.current);
          retryDelayRef.current = Math.min(retryDelayRef.current * 2, 30_000);
        },
      );
      setSseConnected(true);
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      disconnect?.();
    };
    // Depend on `voice.speak` (stable via useCallback) rather than `voice`
    // itself, which is a new object every render and would reconnect the
    // SSE stream constantly. Reconnecting only when the user toggles voice
    // on/off (changing `speak`'s identity) is an acceptable, rare cost.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, token, refreshToday, voice.speak]);

  const value = useMemo(
    () => ({
      today,
      todayError,
      refreshToday,
      liveStatus,
      liveError,
      sseConnected,
      history,
      fetchHistory,
      voice,
      push,
    }),
    [today, todayError, refreshToday, liveStatus, liveError, sseConnected, history, fetchHistory, voice, push],
  );

  return <DigestContext.Provider value={value}>{children}</DigestContext.Provider>;
}

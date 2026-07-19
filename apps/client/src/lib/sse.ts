import type { SSEEvent } from '@repo/shared';
import { API_BASE } from './api';

export function connectToDigestStream(
  token: string,
  onMessage: (event: SSEEvent) => void,
  onError: () => void,
): () => void {
  const source = new EventSource(`${API_BASE}/events/stream?token=${encodeURIComponent(token)}`);

  source.onmessage = (e: MessageEvent<string>) => {
    try {
      const event = JSON.parse(e.data) as SSEEvent;
      onMessage(event);
    } catch {
      // ignore malformed events
    }
  };

  source.onerror = () => {
    onError();
  };

  return () => source.close();
}

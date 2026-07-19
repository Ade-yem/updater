/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => /\/digests(\/|\?|$)/.test(url.pathname + url.search),
  new NetworkFirst({ cacheName: 'api-digests', networkTimeoutSeconds: 5 }),
);

interface DigestPushPayload {
  title?: string;
  body?: string;
  url?: string;
  digestId?: string;
}

self.addEventListener('push', (event) => {
  let payload: DigestPushPayload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    // ignore malformed payload
  }

  const title = payload.title ?? 'Your digest is ready';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body ?? 'Your daily email summary has been generated.',
      icon: '/favicon.svg',
      tag: payload.digestId ?? 'digest-ready',
      data: { url: payload.url ?? '/digest/today' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/digest/today';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsList) => {
      const existing = clientsList.find((c): c is WindowClient => 'focus' in c);
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    }),
  );
});

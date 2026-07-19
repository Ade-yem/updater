import { useCallback, useState } from 'react';
import { pushApi } from '../lib/api';
import { isPushSupported, subscribeToPush, unsubscribeFromPush } from '../lib/push';

const STORAGE_KEY = 'push-notifications-enabled';

interface NotificationState {
  enabled: boolean;
  permission: NotificationPermission;
}

// Reconciles localStorage against the browser's actual Notification.permission
// once at mount time (via lazy useState init) — permission may have been
// revoked since our last visit even though localStorage still says "on".
function getInitialState(supported: boolean): NotificationState {
  if (!supported) return { enabled: false, permission: 'denied' };

  const permission = Notification.permission;
  const storedEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
  const enabled = storedEnabled && permission === 'granted';

  if (storedEnabled && !enabled) localStorage.setItem(STORAGE_KEY, 'false');

  return { enabled, permission };
}

export function useNotifications() {
  const supported = isPushSupported();
  const [{ enabled, permission }, setState] = useState<NotificationState>(() =>
    getInitialState(supported),
  );

  const enable = useCallback(async () => {
    if (!supported || Notification.permission === 'denied') return;

    const result = await Notification.requestPermission();
    if (result !== 'granted') {
      setState((prev) => ({ ...prev, permission: result }));
      return;
    }

    const publicKey = await pushApi.getVapidPublicKey();
    const subscription = await subscribeToPush(publicKey);
    if (!subscription.endpoint || !subscription.keys) return;

    await pushApi.subscribe({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    localStorage.setItem(STORAGE_KEY, 'true');
    setState({ enabled: true, permission: result });
  }, [supported]);

  const disable = useCallback(async () => {
    const endpoint = await unsubscribeFromPush();
    if (endpoint) await pushApi.unsubscribe(endpoint).catch(() => undefined);

    localStorage.setItem(STORAGE_KEY, 'false');
    setState((prev) => ({ ...prev, enabled: false }));
  }, []);

  const toggle = useCallback(() => {
    const action = enabled ? disable() : enable();
    action.catch((err) => console.error('Failed to update push notification settings:', err));
  }, [enabled, enable, disable]);

  return { enabled, permission, supported, toggle };
}

/// <reference types="vite/client" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

interface ActionNotificationOptions extends NotificationOptions {
  vibrate?: number[];
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

// Public client configuration is safe to bundle in a service worker. The
// action endpoint uses an unguessable, expiring token for authorization; the
// publishable key is not a service-role credential.
const SUPABASE_URL = "https://gzyczowqqywesqhqqpdi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_GVQs-O9yijr0XIbB6cVvEw_pvQyFXbX";

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// The page keeps the old bundle until the student confirms an update.
// After SKIP_WAITING, claim existing tabs so the page can detect controlchange.
clientsClaim();

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener('push', (event) => {
  let data: { title?: string; body?: string; data?: Record<string, unknown> } = {};
  try {
    data = event.data ? (event.data.json() as typeof data) : {};
  } catch {
    /* non-JSON push payload */
  }

  const title = data.title || 'JUPEB Master';
  const notificationData = data.data || {};
  const isChat = notificationData.type === 'chat';
  const options: NotificationOptions & {
    vibrate?: number[];
    actions?: Array<{ action: string; title: string; icon?: string }>;
  } = {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    data: notificationData,
    tag: isChat && typeof notificationData.conversation_id === 'string'
      ? `chat:${notificationData.conversation_id}`
      : undefined,
    actions: isChat
      ? [
          { action: 'reply', title: 'Reply' },
          { action: 'read', title: 'Mark as read' },
        ]
      : [],
    requireInteraction: true,
  };

  // If a tab is already focused, the in-app banner (InAppNotificationBar)
  // shows this arrival — skip the duplicate system notification. Mirrors the
  // Android rule: foreground → in-app banner only.
  event.waitUntil(
    (async () => {
      const wins = (await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })) as WindowClient[];
      if (wins.some((c) => c.focused)) return;
      await self.registration.showNotification(title, options);
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = event.notification.data as { url?: string; read_token?: string } | null;

  // The browser notification API has buttons but no native inline text input.
  // "Reply" opens the chat composer; "Mark as read" is processed here.
  if (event.action === 'read' && raw?.read_token) {
    event.waitUntil((async () => {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/notification-action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ token: raw.read_token, action: 'read' }),
        });
      } catch {
        // The in-app conversation remains the authoritative recovery path.
      }
    })());
    return;
  }

  const url = raw?.url || '/';
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (!('focus' in client)) continue;
      if ('navigate' in client) await client.navigate(url);
      await client.focus();
      return;
    }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});

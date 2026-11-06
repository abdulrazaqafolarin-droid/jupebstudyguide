import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

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
  const options: NotificationOptions & { vibrate?: number[] } = {
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

  const raw = event.notification.data as { url?: string } | null;
  const url = raw?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client && (client as WindowClient).url === url) {
          return (client as WindowClient).focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
      return undefined;
    })
  );
});

/// <reference types="vite/client" />
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

// Website releases are delivered by Vercel. Activate a newly deployed worker
// immediately instead of waiting for a student to press an in-app Update button.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

// Take control with the new precache, then reload already-open pages once so
// they stop rendering HTML/JS served by the previous worker. This is a silent
// release transition: no Update prompt is shown. Push handling remains below.
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    await self.clients.claim();
    await Promise.all(windows.map(async (client) => {
      try {
        await client.navigate(client.url);
      } catch {
        // A tab may close while the new worker is activating.
      }
    }));
  })());
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
  const options: ActionNotificationOptions = {
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
  const raw = event.notification.data as { url?: string; read_token?: string } | null;

  // Browser notifications have action buttons but no editable inline text
  // field. "Reply" opens the exact conversation; Android provides RemoteInput.
  if (event.action === 'read' && raw?.read_token) {
    event.waitUntil((async () => {
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/notification-action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ token: raw.read_token, action: 'read' }),
        });
        // Keep the notification visible on network/server errors so the user
        // can retry. 410 means the one-time action was already used or expired.
        if (response.ok || response.status === 410) event.notification.close();
      } catch {
        // Leave the notification available for retry when connectivity returns.
      }
    })());
    return;
  }

  event.notification.close();
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

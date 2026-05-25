import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUserStorage } from './useUserStorage';

export type NotificationKind =
  | 'achievement'
  | 'streak'
  | 'syllabus'
  | 'rank'
  | 'reminder'
  | 'info'
  | 'chat_message'
  | 'friend_request';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  /** Idempotency key — prevents the same event from being posted twice. */
  dedupe?: string;
}

const MAX_NOTIFICATIONS = 50;
const STREAK_REMINDER_HOUR = 18; // 6pm local
const DAILY_REMINDER_HOUR = 9;   // 9am local

/**
 * Per-user notification center with optional Browser Notification API
 * integration. Survives reloads via useUserStorage.
 *
 * Auto-emits:
 *  - "Streak at risk" once per day after 6pm if user hasn't studied
 *  - "Daily study reminder" once per day after 9am if user hasn't opened
 *  - Caller-driven events via `push(...)` for achievements, syllabus, rank, etc.
 */
export function useNotifications(opts: { hasStudiedToday: boolean; currentStreak: number }) {
  const { hasStudiedToday, currentStreak } = opts;
  const [items, setItems] = useUserStorage<AppNotification[]>('notifications', []);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );

  const seenDedupes = useRef<Set<string>>(new Set());
  useEffect(() => {
    seenDedupes.current = new Set(items.map(i => i.dedupe).filter(Boolean) as string[]);
  }, [items]);

  const fireBrowser = useCallback((title: string, body: string) => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body, icon: '/pwa-192x192.svg', badge: '/pwa-192x192.svg' });
    } catch {
      /* some browsers (iOS PWA) require ServiceWorkerRegistration.showNotification */
    }
  }, []);

  const push = useCallback(
    (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
      if (n.dedupe && seenDedupes.current.has(n.dedupe)) return;
      const created: AppNotification = {
        ...n,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now(),
        read: false,
      };
      setItems(prev => [created, ...prev].slice(0, MAX_NOTIFICATIONS));
      fireBrowser(n.title, n.body);
    },
    [setItems, fireBrowser],
  );

  const markAllRead = useCallback(() => {
    setItems(prev => prev.map(i => (i.read ? i : { ...i, read: true })));
  }, [setItems]);

  const markReadExcept = useCallback((kinds: Set<string>) => {
    setItems(prev => prev.map(i =>
      (!i.read && !kinds.has(i.kind)) ? { ...i, read: true } : i
    ));
  }, [setItems]);

  const clear = useCallback(() => setItems([]), [setItems]);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied' as NotificationPermission;
    if (Notification.permission !== 'default') {
      setPermission(Notification.permission);
      return Notification.permission;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  // Streak-at-risk + daily reminder schedulers (in-app, no service worker required).
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const dayKey = now.toISOString().slice(0, 10);

      if (!hasStudiedToday && now.getHours() >= STREAK_REMINDER_HOUR && currentStreak > 0) {
        push({
          kind: 'streak',
          title: `🔥 Don't break your ${currentStreak}-day streak!`,
          body: 'A few questions now will keep your streak alive.',
          dedupe: `streak-risk:${dayKey}`,
        });
      }

      if (!hasStudiedToday && now.getHours() >= DAILY_REMINDER_HOUR) {
        push({
          kind: 'reminder',
          title: '📚 Your daily study slot is ready',
          body: 'Even 10 minutes of practice compounds. Tap to begin.',
          dedupe: `daily:${dayKey}`,
        });
      }
    };

    check();
    const id = setInterval(check, 5 * 60 * 1000); // every 5 min
    return () => clearInterval(id);
  }, [hasStudiedToday, currentStreak, push]);

  const unreadCount = useMemo(() => items.filter(i => !i.read).length, [items]);

  return {
    notifications: items,
    unreadCount,
    push,
    markAllRead,
    clear,
    permission,
    requestPermission,
  };
}

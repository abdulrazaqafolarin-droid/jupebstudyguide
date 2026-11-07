import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/** Native notification APIs are available to both Capacitor mobile targets. */
export const isNativePlatform = Capacitor.isNativePlatform();
const isAndroidPlatform = Capacitor.getPlatform() === 'android';

const ENABLED_KEY = 'native-notifications-enabled';

export const NOTIFICATION_CHANNELS = {
  messages: 'messages',
  requests: 'requests',
  reminders: 'reminders',
} as const;

/**
 * App-level on/off (the switch in NotificationCenter). Defaults to ON —
 * actual delivery is still gated by the OS permission; the flag only lets
 * the user mute everything without leaving the app.
 */
export function isNativeNotificationsEnabled(): boolean {
  try {
    const preference = localStorage.getItem(ENABLED_KEY);
    // iOS asks for notification permission only after an explicit user opt-in.
    // Preserve the existing Android default while avoiding an unsolicited iOS prompt.
    return preference === null ? isAndroidPlatform : preference === '1';
  } catch {
    return true;
  }
}

export function setNativeNotificationsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
  } catch {
    /* storage may be full — the flag is best-effort */
  }
  // Let NativeNotificationBridge re-sync this device's FCM token row —
  // "mute everything" has to stop server-side pushes too, not just local
  // posts, or the shade would keep popping after the switch goes off.
  window.dispatchEvent(new CustomEvent('native-notifications-pref'));
}

let channelsReady = false;

/**
 * Create Android 8+ notification channels. iOS has no channel concept, so
 * the function deliberately becomes a no-op there. Importance HIGH is what
 * produces the WhatsApp look (heads-up popup + sound) — the plugin's default
 * channel importance is only IMPORTANCE_DEFAULT (shade-only, no popup), and
 * channel vibration defaults to off, so both are set explicitly here.
 */
export async function ensureNotificationChannels(): Promise<void> {
  if (!isAndroidPlatform || channelsReady) return;
  try {
    await LocalNotifications.createChannel({
      id: NOTIFICATION_CHANNELS.messages,
      name: 'Messages',
      description: 'New chat messages',
      importance: 5, // IMPORTANCE_HIGH → heads-up popup + sound
      visibility: 1, // show content on the lock screen
      vibration: true,
    });
    await LocalNotifications.createChannel({
      id: NOTIFICATION_CHANNELS.requests,
      name: 'Requests',
      description: 'Friend requests and group invites',
      importance: 5,
      visibility: 1,
      vibration: true,
    });
    await LocalNotifications.createChannel({
      id: NOTIFICATION_CHANNELS.reminders,
      name: 'Study reminders',
      description: 'Daily study and streak reminders',
      importance: 5,
      visibility: 1,
      vibration: true,
    });
    channelsReady = true;
  } catch (e) {
    console.warn('Could not create notification channels:', e);
  }
}

function mapPermission(display: string): NotificationPermission {
  if (display === 'granted') return 'granted';
  if (display === 'prompt' || display === 'prompt-with-rationale') return 'default';
  return 'denied';
}

/** Android 13+ runtime permission, mapped onto the web tri-state so the
 *  existing NotificationCenter UI keeps working unchanged on both platforms. */
export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (!isNativePlatform) {
    return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  }
  try {
    return mapPermission((await LocalNotifications.checkPermissions()).display);
  } catch {
    return 'default';
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNativePlatform) {
    if (typeof Notification === 'undefined') return 'denied';
    return Notification.requestPermission();
  }
  try {
    return mapPermission((await LocalNotifications.requestPermissions()).display);
  } catch {
    return 'denied';
  }
}

export interface NativeNotificationInput {
  channelId: string;
  title: string;
  body: string;
  /** Stable int id — the same id replaces the previous notification. */
  id: number;
  /** Deep-link payload handed back on tap. */
  data?: Record<string, string>;
}

/**
 * Post an immediate heads-up notification (no-op on the web or when the
 * user turned notifications off). No `schedule` field = fires right away —
 * verified in the plugin: unscheduled notifications go straight to
 * NotificationManager.notify() instead of AlarmManager.
 */
export async function postNativeNotification(input: NativeNotificationInput): Promise<void> {
  if (!isNativePlatform || !isNativeNotificationsEnabled()) return;
  try {
    await ensureNotificationChannels();
    const notification = {
      id: input.id,
      title: input.title,
      body: input.body,
      extra: input.data ?? {},
      ...(isAndroidPlatform
        ? { channelId: input.channelId, foreground: true }
        : {}),
    };
    await LocalNotifications.schedule({ notifications: [notification] });
  } catch (e) {
    console.warn('Failed to post native notification:', e);
  }
}

const DAILY_REMINDER_ID = 9001;
const STREAK_REMINDER_ID = 9002;

/**
 * Schedule repeating 09:00 / 18:00 study reminders using Capacitor's
 * cross-platform calendar schedule. Android uses inexact alarms; iOS uses
 * UNUserNotificationCenter repeating calendar triggers.
 *
 * `on: { hour, minute }` is supported on both iOS and Android. The
 * Android-only channel, foreground and exact-alarm flags are omitted on iOS.
 */
export async function scheduleDailyReminders(): Promise<void> {
  if (!isNativePlatform || !isNativeNotificationsEnabled()) return;
  try {
    await ensureNotificationChannels();
    // Cancel first so re-scheduling on every app launch stays idempotent.
    await LocalNotifications.cancel({
      notifications: [{ id: DAILY_REMINDER_ID }, { id: STREAK_REMINDER_ID }],
    });
    const androidOptions = isAndroidPlatform
      ? { channelId: NOTIFICATION_CHANNELS.reminders, isExactNotification: false, foreground: true }
      : {};
    await LocalNotifications.schedule({
      notifications: [
        {
          id: DAILY_REMINDER_ID,
          ...androidOptions,
          title: '📚 Your Daily Mission is ready',
          body: 'One lesson and a short question set — about 10 minutes. Keep your streak alive.',
          extra: { type: 'home' },
          schedule: { on: { hour: 9, minute: 0 } },
        },
        {
          id: STREAK_REMINDER_ID,
          ...androidOptions,
          title: '🔥 Daily Mission check-in',
          body: 'Not started yet? A few questions now keep your streak alive.',
          extra: { type: 'home' },
          schedule: { on: { hour: 18, minute: 0 } },
        },
      ],
    });
  } catch (e) {
    console.warn('Could not schedule daily reminders:', e);
  }
}

/**
 * Called when today's mission completes: drop only the 18:00 evening
 * check-in so a finished student isn't nagged tonight. The 09:00 alarm
 * repeats under its own id, so tomorrow's "mission ready" prompt still
 * fires, and the next app launch restores the evening one anyway.
 */
export async function suppressEveningReminder(): Promise<void> {
  if (!isNativePlatform) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: STREAK_REMINDER_ID }] });
  } catch {
    /* nothing scheduled / already gone */
  }
}

export async function cancelDailyReminders(): Promise<void> {
  if (!isNativePlatform) return;
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: DAILY_REMINDER_ID }, { id: STREAK_REMINDER_ID }],
    });
  } catch {
    /* nothing scheduled / already gone */
  }
}

/**
 * Tap handler. Capacitor retains `localNotificationActionPerformed` until a
 * listener attaches (and forwards the cold-start launch intent), so taps
 * that wake a killed app are delivered too — the app opens, then routes.
 */
export async function onNativeNotificationTap(
  handler: (data: Record<string, string>) => void,
): Promise<() => void> {
  if (!isNativePlatform) return () => {};
  const handle = await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    try {
      handler((action.notification?.extra ?? {}) as Record<string, string>);
    } catch (e) {
      console.warn('Notification tap handler failed:', e);
    }
  });
  return () => {
    void handle.remove();
  };
}

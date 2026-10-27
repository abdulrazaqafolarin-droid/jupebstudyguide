import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/** True inside the Capacitor shell (the sideloaded Android APK). */
export const isNativePlatform = Capacitor.isNativePlatform();

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
    return localStorage.getItem(ENABLED_KEY) !== '0';
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
 * Create the Android 8+ notification channels. Importance HIGH is what
 * produces the WhatsApp look (heads-up popup + sound) — the plugin's default
 * channel importance is only IMPORTANCE_DEFAULT (shade-only, no popup), and
 * channel vibration defaults to off, so both are set explicitly here.
 */
export async function ensureNotificationChannels(): Promise<void> {
  if (!isNativePlatform || channelsReady) return;
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
    await LocalNotifications.schedule({
      notifications: [
        {
          id: input.id,
          title: input.title,
          body: input.body,
          channelId: input.channelId,
          foreground: true, // Android: raise priority → heads-up popup
          extra: input.data ?? {},
        },
      ],
    });
  } catch (e) {
    console.warn('Failed to post native notification:', e);
  }
}

const DAILY_REMINDER_ID = 9001;
const STREAK_REMINDER_ID = 9002;

/**
 * Schedule the repeating 09:00 / 18:00 study reminders. AlarmManager backs
 * these, so they fire even when the app is closed, and the plugin restores
 * them after a reboot.
 *
 * Implementation notes (verified against the plugin source):
 *  - `on: { hour, minute }` is the correct daily path on Android — the
 *    `at` + `repeats` path computes its repeat interval from the time until
 *    the first fire, which produces a wrong (shrinking) cadence.
 *  - `isExactNotification: false` because targetSdk 36 gets no default
 *    exact-alarm permission; an exact alarm would open the system
 *    "Alarms & reminders" settings screen on launch.
 */
export async function scheduleDailyReminders(): Promise<void> {
  if (!isNativePlatform || !isNativeNotificationsEnabled()) return;
  try {
    await ensureNotificationChannels();
    // Cancel first so re-scheduling on every app launch stays idempotent.
    await LocalNotifications.cancel({
      notifications: [{ id: DAILY_REMINDER_ID }, { id: STREAK_REMINDER_ID }],
    });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: DAILY_REMINDER_ID,
          channelId: NOTIFICATION_CHANNELS.reminders,
          title: '📚 Your Daily Mission is ready',
          body: 'One lesson and a short question set — about 10 minutes. Keep your streak alive.',
          extra: { type: 'home' },
          schedule: { on: { hour: 9, minute: 0 } },
          isExactNotification: false,
          foreground: true,
        },
        {
          id: STREAK_REMINDER_ID,
          channelId: NOTIFICATION_CHANNELS.reminders,
          title: '🔥 Daily Mission check-in',
          body: 'Not started yet? A few questions now keep your streak alive.',
          extra: { type: 'home' },
          schedule: { on: { hour: 18, minute: 0 } },
          isExactNotification: false,
          foreground: true,
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

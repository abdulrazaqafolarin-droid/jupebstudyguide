import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PushNotifications } from '@capacitor/push-notifications';
import type { PluginListenerHandle } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  isNativePlatform,
  ensureNotificationChannels,
  scheduleDailyReminders,
  isNativeNotificationsEnabled,
  onNativeNotificationTap,
} from '@/lib/native-notifications';

interface IncomingMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content?: string | null;
  message_type?: string | null;
}

/**
 * App-scoped bridge between Supabase Realtime and Android notifications.
 * Mounted once inside the router so it hears new messages no matter which
 * screen is open — useChat's own listener only exists while the Chat page
 * is mounted, so messages arriving on any other screen used to be
 * completely silent.
 *
 * WhatsApp rules:
 *  - foreground → the existing in-app banner handles it (no system popup)
 *  - background/closed → FCM push owns the system shade. A DB trigger calls
 *    the push-fcm Edge Function, which pops via FCM even when Android has
 *    killed the app entirely (LocalNotifications can't run then).
 *  - muted conversations and the app-level mute switch stay silent everywhere
 *  - tapping a message notification opens that conversation
 */
export function NativeNotificationBridge() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const tokenRef = useRef<string | null>(null);

  // Channels + repeating 09:00/18:00 reminders + local tap routing.
  useEffect(() => {
    if (!isNativePlatform || !user) return;
    let disposed = false;

    void (async () => {
      await ensureNotificationChannels();
      if (!disposed && isNativeNotificationsEnabled()) {
        await scheduleDailyReminders();
      }
    })();

    let removeTapListener: (() => void) | undefined;
    void onNativeNotificationTap((data) => {
      if (data.type === 'chat') {
        navigate(
          data.conversationId
            ? `/chat?conversation=${encodeURIComponent(data.conversationId)}`
            : '/chat',
        );
      } else if (data.type === 'friends') {
        navigate('/friends');
      } else {
        navigate('/'); // reminders / anything else land on home
      }
    }).then((remove) => {
      if (disposed) remove();
      else removeTapListener = remove;
    });

    return () => {
      disposed = true;
      removeTapListener?.();
    };
  }, [user, navigate]);

  // FCM: register this device's token so the server can push while the app
  // is backgrounded or fully closed, and route notification taps back into
  // the right conversation.
  useEffect(() => {
    if (!isNativePlatform || !user) return;
    let disposed = false;
    const handles: PluginListenerHandle[] = [];

    const syncToken = async (token: string) => {
      if (disposed) return;
      if (!isNativeNotificationsEnabled()) {
        // App-level mute → tell the server to stop targeting this device.
        const { error } = await supabase.from('device_tokens').delete().eq('token', token);
        if (error) console.warn('[push] token delete failed:', error.message);
        return;
      }
      // upsert on token: a device keeps ONE row, re-pointed at whoever is
      // logged in on it now (RLS "claim" policy allows exactly that).
      const { error } = await supabase
        .from('device_tokens')
        .upsert({ user_id: user.id, token, platform: 'android' }, { onConflict: 'token' });
      if (error) console.warn('[push] token upsert failed:', error.message);
    };

    void (async () => {
      try {
        handles.push(
          await PushNotifications.addListener('registration', (event) => {
            if (!event.value) return;
            tokenRef.current = event.value;
            void syncToken(event.value);
          }),
        );
        handles.push(
          await PushNotifications.addListener('registrationError', (event) => {
            console.warn('[push] registration error:', event.error);
          }),
        );
        // Tap routing. Covers warm taps (onNewIntent) and cold starts:
        // BridgeActivity forwards the launch intent to plugins and Capacitor
        // retains the event until this listener attaches.
        handles.push(
          await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            if (disposed) return;
            const data = (notification.notification?.data ?? {}) as Record<string, unknown>;
            const conversationId =
              typeof data.conversation_id === 'string' ? data.conversation_id : '';
            if (data.type === 'chat' || conversationId) {
              navigate(
                conversationId
                  ? `/chat?conversation=${encodeURIComponent(conversationId)}`
                  : '/chat',
              );
            }
          }),
        );
        // One OS dialog (Android 13+ POST_NOTIFICATIONS). register() still
        // yields a token when denied — pushes start the moment the user
        // flips permission on in system settings, no reinstall needed.
        await PushNotifications.requestPermissions().catch(() => undefined);
        await PushNotifications.register();
      } catch (e) {
        console.warn('[push] init failed:', e);
      }
    })();

    // The mute-everywhere switch flips server-side targeting too.
    const onPrefChanged = () => {
      if (tokenRef.current) void syncToken(tokenRef.current);
    };
    window.addEventListener('native-notifications-pref', onPrefChanged);

    return () => {
      disposed = true;
      window.removeEventListener('native-notifications-pref', onPrefChanged);
      for (const handle of handles) void handle.remove();
    };
  }, [user, navigate]);

  // Realtime messages → in-app banner on any screen. The system shade is
  // FCM's job now (effect above); posting LocalNotifications here as well
  // would double-pop every backgrounded message.
  useEffect(() => {
    if (!isNativePlatform || !user) return;

    const channel = supabase
      .channel(`native-notify-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=neq.${user.id}` },
        (payload) => {
          const msg = payload.new as IncomingMessage;
          if (msg.sender_id === user.id) return;

          // Mirror the in-app banner event: InAppNotificationBar listens on
          // window, but useChat only dispatches while the Chat page is
          // mounted — without this, messages on other screens showed no
          // banner either. The bar dedupes by message id, so double
          // dispatch (Chat page open) is harmless.
          window.dispatchEvent(new CustomEvent('chat-new-message', { detail: { message: msg } }));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
}

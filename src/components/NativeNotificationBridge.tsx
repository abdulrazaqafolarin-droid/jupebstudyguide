import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  isNativePlatform,
  ensureNotificationChannels,
  scheduleDailyReminders,
  isNativeNotificationsEnabled,
  postNativeNotification,
  onNativeNotificationTap,
  NOTIFICATION_CHANNELS,
} from '@/lib/native-notifications';
import { buildMessagePreview, stableNotificationId } from '@/lib/message-preview';

interface IncomingMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content?: string | null;
  message_type?: string | null;
}

/**
 * App-scoped bridge between Supabase Realtime and the Android notification
 * shade. Mounted once inside the router so it hears new messages no matter
 * which screen is open — useChat's own listener only exists while the Chat
 * page is mounted, so messages arriving on any other screen used to be
 * completely silent.
 *
 * WhatsApp rules:
 *  - foreground → the existing in-app banner handles it (no system popup)
 *  - background → heads-up system notification with sender + preview
 *  - muted conversations stay silent everywhere
 *  - tapping a message notification opens that conversation
 */
export function NativeNotificationBridge() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Channels + repeating 09:00/18:00 reminders + tap routing.
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

  // Realtime messages → shade notification when backgrounded.
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

          // Foreground is the in-app banner's job; the shade only when hidden.
          if (document.visibilityState !== 'hidden') return;
          if (!isNativeNotificationsEnabled()) return;

          void (async () => {
            try {
              const { data: isMuted } = await supabase.rpc('is_muted', {
                p_conversation_id: msg.conversation_id,
              });
              if (isMuted === true) return;

              // Same membership guard the in-app banner applies.
              const { data: part } = await supabase
                .from('conversation_participants')
                .select('conversation_id')
                .eq('user_id', user.id)
                .eq('conversation_id', msg.conversation_id)
                .maybeSingle();
              if (!part) return;

              const { data: profile } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('user_id', msg.sender_id)
                .maybeSingle();

              await postNativeNotification({
                channelId: NOTIFICATION_CHANNELS.messages,
                // Stable per conversation → each chat keeps ONE shade entry
                // that the newest message replaces (WhatsApp-style).
                id: stableNotificationId(`conv-${msg.conversation_id}`),
                title: (profile as { display_name: string | null } | null)?.display_name || 'Someone',
                body: buildMessagePreview(msg),
                data: { type: 'chat', conversationId: msg.conversation_id },
              });
            } catch (e) {
              console.warn('Native message notification failed:', e);
            }
          })();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
}

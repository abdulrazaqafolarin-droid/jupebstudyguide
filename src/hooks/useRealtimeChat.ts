import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Message } from './useChat';

interface UseRealtimeChatProps {
  conversationId: string | null;
  currentUserId: string | null;
  onNewMessage: (message: Message) => void;
  onPresenceUpdate?: (presenceState: Record<string, any>) => void;
  onTypingUpdate?: (isTyping: boolean, userId: string) => void;
}

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useRealtimeChat({
  conversationId,
  currentUserId,
  onNewMessage,
}: UseRealtimeChatProps) {
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const channelRef = useRef<ReturnType<typeof supabase.channel>>();
  const disposedRef = useRef(false);
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  const subscribe = useCallback(() => {
    const cid = conversationIdRef.current;
    const uid = currentUserIdRef.current;
    if (!cid || !uid) return;

    disposedRef.current = false;

    const channel = supabase.channel(`chat-conv-${cid}`);
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${cid}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          console.log('[Realtime] New message received:', newMsg);
          if (newMsg.sender_id === uid) return;
          onNewMessageRef.current(newMsg);
        }
      )
      .subscribe((status, err) => {
        if (disposedRef.current) return;

        console.log('[Realtime] Subscription status:', status, 'conv:', cid);

        if (status === 'SUBSCRIBED') {
          reconnectAttemptsRef.current = 0;
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[useRealtimeChat] channel error:', err);
          scheduleReconnect();
        } else if (status === 'CLOSED') {
          console.warn('[useRealtimeChat] channel closed');
          scheduleReconnect();
        } else if (status === 'TIMED_OUT') {
          console.warn('[useRealtimeChat] channel timed out');
          scheduleReconnect();
        }
      });
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (disposedRef.current) return;
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[useRealtimeChat] max reconnect attempts reached');
      return;
    }

    clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(() => {
      if (disposedRef.current) return;
      reconnectAttemptsRef.current++;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      subscribe();
    }, RECONNECT_DELAY * Math.pow(1.5, reconnectAttemptsRef.current));
  }, [subscribe]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    disposedRef.current = false;
    reconnectAttemptsRef.current = 0;

    // Small delay to avoid rapid subscribe/unsubscribe on conversation switch
    const timer = setTimeout(() => {
      subscribe();
    }, 100);

    return () => {
      disposedRef.current = true;
      clearTimeout(timer);
      clearTimeout(reconnectTimerRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = undefined;
      }
    };
  }, [conversationId, currentUserId, subscribe]);
}

import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Message } from './useChat';

interface UseRealtimeChatProps {
  conversationId: string | null;
  currentUserId: string | null;
  onNewMessage: (message: Message) => void;
}

const RECONNECT_BASE_MS = 1500;
const RECONNECT_MAX_MS = 30000;

export function useRealtimeChat({
  conversationId,
  currentUserId,
  onNewMessage,
}: UseRealtimeChatProps) {
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const disposedRef = useRef(false);
  const onNewMessageRef = useRef(onNewMessage);
  const conversationIdRef = useRef(conversationId);
  const currentUserIdRef = useRef(currentUserId);
  const connectRef = useRef<() => void>(() => undefined);

  onNewMessageRef.current = onNewMessage;
  conversationIdRef.current = conversationId;
  currentUserIdRef.current = currentUserId;

  const scheduleReconnect = useCallback(() => {
    if (disposedRef.current || reconnectTimerRef.current) return;

    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(1.7, reconnectAttemptsRef.current),
      RECONNECT_MAX_MS,
    );
    reconnectAttemptsRef.current += 1;
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      if (!disposedRef.current) connectRef.current();
    }, delay + Math.floor(Math.random() * 500));
  }, []);

  const connect = useCallback(() => {
    const cid = conversationIdRef.current;
    const uid = currentUserIdRef.current;
    if (disposedRef.current || !cid || !uid || channelRef.current) return;

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
          const message = payload.new as Message;
          if (message.sender_id === uid) return;
          onNewMessageRef.current(message);
        },
      )
      .subscribe((status, error) => {
        if (disposedRef.current || channelRef.current !== channel) return;

        if (status === 'SUBSCRIBED') {
          reconnectAttemptsRef.current = 0;
          return;
        }

        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          console.warn('[useRealtimeChat] channel reconnecting:', status, error);
          channelRef.current = null;
          void supabase.removeChannel(channel);
          scheduleReconnect();
        }
      });
  }, [scheduleReconnect]);

  connectRef.current = connect;

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    disposedRef.current = false;
    reconnectAttemptsRef.current = 0;
    connectRef.current();

    return () => {
      disposedRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      const channel = channelRef.current;
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);
}

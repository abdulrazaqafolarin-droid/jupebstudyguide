import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Message } from './useChat';

interface UseRealtimeChatProps {
  conversationId: string | null;
  currentUserId: string | null;
  onNewMessage: (message: Message) => void;
}

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useRealtimeChat({
  conversationId,
  currentUserId,
  onNewMessage,
}: UseRealtimeChatProps) {
  console.log('[Realtime] Hook mounted, conversationId:', conversationId, 'userId:', currentUserId);

  const msgReconnectAttemptsRef = useRef(0);
  const msgReconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const msgChannelRef = useRef<ReturnType<typeof supabase.channel>>();
  const msgDisposedRef = useRef(false);
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  const msgSubscribe = useCallback(() => {
    const cid = conversationIdRef.current;
    const uid = currentUserIdRef.current;
    if (!cid || !uid) {
      console.log('[Realtime] msgSubscribe skipped: no cid or uid', { cid, uid });
      return;
    }
    console.log('[Realtime] Creating channel for conversation:', cid, 'user:', uid);

    msgDisposedRef.current = false;

    const channel = supabase.channel(`chat-conv-${cid}`);
    msgChannelRef.current = channel;

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
          console.log('[Realtime] INSERT:', newMsg.id, 'conv:', newMsg.conversation_id, 'from:', newMsg.sender_id);
          if (newMsg.sender_id === uid) return;
          onNewMessageRef.current(newMsg);
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] subscribe status:', status, 'convId:', conversationIdRef.current, 'userId:', currentUserIdRef.current);
        if (msgDisposedRef.current) return;

        if (status === 'SUBSCRIBED') {
          msgReconnectAttemptsRef.current = 0;
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
          console.warn('[useRealtimeChat] messages channel', status, err);
          scheduleMsgReconnect();
        }
      });
  }, []);

  const scheduleMsgReconnect = useCallback(() => {
    if (msgDisposedRef.current) return;
    if (msgReconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[useRealtimeChat] max messages reconnect attempts reached');
      return;
    }

    clearTimeout(msgReconnectTimerRef.current);
    msgReconnectTimerRef.current = setTimeout(() => {
      if (msgDisposedRef.current) return;
      msgReconnectAttemptsRef.current++;
      if (msgChannelRef.current) {
        supabase.removeChannel(msgChannelRef.current);
      }
      msgSubscribe();
    }, RECONNECT_DELAY * Math.pow(1.5, msgReconnectAttemptsRef.current));
  }, [msgSubscribe]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    msgDisposedRef.current = false;
    msgReconnectAttemptsRef.current = 0;

    const timer = setTimeout(() => {
      msgSubscribe();
    }, 100);

    return () => {
      msgDisposedRef.current = true;
      clearTimeout(timer);
      clearTimeout(msgReconnectTimerRef.current);
      if (msgChannelRef.current) {
        supabase.removeChannel(msgChannelRef.current);
        msgChannelRef.current = undefined;
      }
    };
  }, [conversationId, currentUserId, msgSubscribe]);


}

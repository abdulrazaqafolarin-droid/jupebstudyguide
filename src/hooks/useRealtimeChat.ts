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
const POLL_INTERVAL = 3000;

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
  const pollTimerRef = useRef<ReturnType<typeof setInterval>>();
  const lastPollCursorRef = useRef<string>(new Date(0).toISOString());
  const pollFailedRef = useRef(false);

  const startPolling = useCallback(() => {
    const cid = conversationIdRef.current;
    const uid = currentUserIdRef.current;
    if (!cid || !uid) return;

    clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      if (msgDisposedRef.current || !cid || !uid) return;
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', cid)
          .gt('created_at', lastPollCursorRef.current)
          .order('created_at', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) {
          lastPollCursorRef.current = data[data.length - 1].created_at;
          for (const msg of data) {
            if (msg.sender_id === uid) continue;
            onNewMessageRef.current(msg as Message);
          }
        }
        pollFailedRef.current = false;
      } catch (err) {
        if (!pollFailedRef.current) {
          console.warn('[Realtime] poll error:', err);
          pollFailedRef.current = true;
        }
      }
    }, POLL_INTERVAL);
  }, []);

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
          lastPollCursorRef.current = newMsg.created_at;
          onNewMessageRef.current(newMsg);
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] subscribe status:', status, 'convId:', conversationIdRef.current, 'userId:', currentUserIdRef.current);
        if (msgDisposedRef.current) return;

        if (status === 'SUBSCRIBED') {
          msgReconnectAttemptsRef.current = 0;
          clearInterval(pollTimerRef.current);
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
          console.warn('[useRealtimeChat] messages channel', status, err);
          startPolling();
          scheduleMsgReconnect();
        }
      });
  }, [startPolling]);

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
      clearInterval(pollTimerRef.current);
      if (msgChannelRef.current) {
        supabase.removeChannel(msgChannelRef.current);
        msgChannelRef.current = undefined;
      }
    };
  }, [conversationId, currentUserId, msgSubscribe]);


}

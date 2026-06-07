import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Message } from './useChat';

interface UseRealtimeChatProps {
  conversationId: string | null;
  currentUserId: string | null;
  onNewMessage: (message: Message) => void;
  onPresenceUpdate: (presenceState: Record<string, any>) => void;
  onTypingUpdate: (isTyping: boolean, userId: string) => void;
  onDebugLog?: (msg: string) => void;
}

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useRealtimeChat({
  conversationId,
  currentUserId,
  onNewMessage,
  onPresenceUpdate,
  onTypingUpdate,
  onDebugLog,
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

  const presenceStateRef = useRef<Record<string, any>>({});
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel>>();
  const onPresenceUpdateRef = useRef(onPresenceUpdate);
  onPresenceUpdateRef.current = onPresenceUpdate;
  const onTypingUpdateRef = useRef(onTypingUpdate);
  onTypingUpdateRef.current = onTypingUpdate;
  const onDebugLogRef = useRef(onDebugLog);
  onDebugLogRef.current = onDebugLog;

  const msgSubscribe = useCallback(() => {
    const cid = conversationIdRef.current;
    const uid = currentUserIdRef.current;
    if (!cid || !uid) {
      console.log('[Realtime] msgSubscribe skipped: no cid or uid', { cid, uid });
      onDebugLogRef.current?.('SKIP: no convId or userId');
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
          onDebugLogRef.current?.('INSERT:' + payload.new?.id);
          console.log('[Realtime] INSERT fired for message:', payload.new?.id, 'conv:', payload.new?.conversation_id);
          const newMsg = payload.new as any;
          console.log('[Realtime] New message received:', newMsg?.id, 'from:', newMsg?.sender_id, 'conv:', newMsg?.conversation_id);
          if (newMsg.sender_id === uid) return;

          supabase
            .from('messages')
            .select('id, conversation_id, content, created_at, sender_id, message_type, is_deleted, is_read, delivered_at, read_at, image_url, file_url, file_name, file_size, file_type, reply_to_id, is_edited, reactions, forwarded_from')
            .eq('id', newMsg.id)
            .single()
            .then(({ data }) => {
              if (data) onNewMessageRef.current(data as Message);
            });
        }
      )
      .subscribe((status, err) => {
        onDebugLogRef.current?.('status:' + status);
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

  useEffect(() => {
    if (!currentUserId) {
      console.log('[Realtime] user_presence effect skipped: no currentUserId');
      return;
    }
    console.log('[Realtime] user_presence effect running for user:', currentUserId);

    const channel = supabase.channel('user-presence-global');
    presenceChannelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        },
        (payload) => {
          const row = payload.new as Record<string, any>;
          if (!row || row.user_id === currentUserId) return;

          console.log('[Realtime] presence update:', row.user_id, 'online:', row.is_online, 'typing_in:', row.typing_in);
          const prevState = presenceStateRef.current[row.user_id];

          presenceStateRef.current = {
            ...presenceStateRef.current,
            [row.user_id]: {
              is_online: row.is_online ?? false,
              last_seen_at: row.last_seen_at ?? null,
              typing_in: row.typing_in ?? null,
              online_at: row.online_at ?? null,
            },
          };

          if (onPresenceUpdateRef.current) {
            onPresenceUpdateRef.current({ ...presenceStateRef.current });
          }

          const typingConv = row.typing_in;
          const wasTyping = prevState?.typing_in != null;
          const isNowTyping = typingConv != null && typingConv === conversationIdRef.current;

          if (wasTyping !== isNowTyping) {
            onTypingUpdateRef.current(isNowTyping, row.user_id);
          }
        }
      )
      .subscribe((status) => {
        console.log('[useRealtimeChat] user_presence status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
      presenceChannelRef.current = undefined;
    };
  }, [currentUserId]);
}

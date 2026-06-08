import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const DEBUG = import.meta.env.DEV;

function debug(...args: unknown[]) {
  if (DEBUG) console.log(...args);
}

function debugWarn(...args: unknown[]) {
  if (DEBUG) console.warn(...args);
}

const CROSS_TAB_CHANNEL = 'jupeb-unread-sync';
const MAX_RETRIES = 3;
const UNREAD_CACHE_KEY = 'jupeb-unread-cache';
const CACHE_TTL = 5 * 60 * 1000;

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  throw new Error('unreachable');
}

export interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  other_user: Profile | null;
  last_message: Message | null;
  unread_count: number;
  is_group?: boolean;
  group_name?: string;
  group_avatar?: string | null;
  participants?: Profile[];
  messages_policy?: string;
  is_admin?: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  delivered_at?: string | null;
  read_at?: string | null;
  message_type?: 'text' | 'image' | 'file' | 'video' | 'audio';
  reply_to_id?: string | null;
  is_edited?: boolean;
  is_deleted?: boolean;
  reactions?: Record<string, string[]>;
  image_url?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  file_type?: string | null;
  group_name?: string;
  forwarded_from?: {
    message_id: string;
    sender_id: string;
    sender_name: string | null;
    conversation_id: string;
    forwarded_at: string;
  } | null;
}

const MESSAGES_PAGE_SIZE = 50;

export function useChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const convIdsRef = useRef<string[]>([]);
  const msgBroadcastRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fetchGenRef = useRef(0);
  const messagesFetchGenRef = useRef(0);
  const messagesCursorRef = useRef<{ created_at: string; id: string } | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const [markingRead, setMarkingRead] = useState<Set<string>>(new Set());
  const [staleUnread, setStaleUnread] = useState(false);
  const markReadQueue = useRef<Array<{ conversationId: string; userId: string; resolve: () => void }>>([]);
  const markReadProcessing = useRef(false);
  const activeConvRef = useRef<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const [globalChannelStatus, setGlobalChannelStatus] = useState<string>('idle');
  const [globalInsertCount, setGlobalInsertCount] = useState(0);
  type OfflineItem = { conversationId: string } & (
    | { kind: 'text'; content: string; replyToId?: string | null }
    | { kind: 'image'; imageUrl: string }
    | { kind: 'file'; fileUrl: string; fileName: string; fileSize: number; fileType: string }
  );
  const offlineQueueRef = useRef<OfflineItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const channelReadyRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval>>();
  const pollCursorRef = useRef<string>('');
  const readReceiptPollRef = useRef<ReturnType<typeof setInterval>>();

  const conversationsRef = useRef<Conversation[]>([]);
  // Keep refs in sync with state
  useEffect(() => {
    activeConvRef.current = activeConversation;
  }, [activeConversation]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const broadcastRead = useCallback((conversationId: string) => {
    try {
      broadcastRef.current?.postMessage({ type: 'read', conversationId });
    } catch {
      /* silently fail */
    }
  }, []);

  const processMarkReadQueue = useCallback(async () => {
    if (markReadProcessing.current) return;
    markReadProcessing.current = true;
    while (markReadQueue.current.length > 0) {
      const item = markReadQueue.current.shift()!;
      try {
        await retryWithBackoff(async () => {
          const { error: msgErr } = await supabase
            .from('messages')
            .update({
              is_read: true,
              read_at: new Date().toISOString(),
            })
            .eq('conversation_id', item.conversationId)
            .neq('sender_id', item.userId)
            .eq('is_read', false);
          if (msgErr) throw msgErr;
          const { error: rpcErr } = await supabase
            .rpc('mark_conversation_read', {
              p_conversation_id: item.conversationId,
              p_user_id: item.userId,
            });
          if (rpcErr) throw rpcErr;
        });
        setConversations(prev => prev.map(c =>
          c.id === item.conversationId ? { ...c, unread_count: 0 } : c
        ));
        broadcastRead(item.conversationId);
      } catch (err) {
        console.error('Mark-read failed after retries, badge unchanged:', err);
      } finally {
        setMarkingRead(prev => { const next = new Set(prev); next.delete(item.conversationId); return next; });
      }
      item.resolve();
    }
    markReadProcessing.current = false;
  }, [broadcastRead]);

  const enqueueMarkRead = useCallback((conversationId: string, userId: string) => {
    setMarkingRead(prev => new Set(prev).add(conversationId));
    return new Promise<void>((resolve) => {
      const alreadyQueued = markReadQueue.current.some(item => item.conversationId === conversationId);
      if (!alreadyQueued) {
        markReadQueue.current.push({ conversationId, userId, resolve });
      } else {
        resolve();
      }
      processMarkReadQueue();
    });
  }, [processMarkReadQueue]);

  const saveUnreadCache = useCallback((counts: Record<string, number>, total: number) => {
    try {
      localStorage.setItem(UNREAD_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        counts,
        total,
      }));
    } catch { /* storage full or unavailable */ }
  }, []);

  const loadUnreadCache = useCallback((): { counts: Record<string, number>; total: number } | null => {
    try {
      const raw = localStorage.getItem(UNREAD_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
      return { counts: parsed.counts ?? {}, total: parsed.total ?? 0 };
    } catch { return null; }
  }, []);

  const totalUnreadCount = useMemo(
    () => conversations.filter(c => c.unread_count > 0).length,
    [conversations],
  );

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const gen = ++fetchGenRef.current;
    setLoading(true);
    try {
      const { data: participantData } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (!participantData?.length) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convIds = participantData.map(p => p.conversation_id);
      convIdsRef.current = convIds;

      // NOTE: messages_policy and is_admin columns exist in migration
      // 20260608000001_multi_admin_messaging.sql but may not be applied yet.
      // Only select columns that exist in the current schema to avoid
      // breaking conversation loading.
      const { data: convData } = await supabase
        .from('conversations')
        .select('id, created_at, updated_at, unread_count_a, unread_count_b, group_name, group_avatar')
        .in('id', convIds)
        .order('updated_at', { ascending: false });

      if (!convData) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const { data: allParticipants } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', convIds);

      const participantsByConv = new Map<string, string[]>();
      for (const p of allParticipants ?? []) {
        const list = participantsByConv.get(p.conversation_id) ?? [];
        list.push(p.user_id);
        participantsByConv.set(p.conversation_id, list);
      }
      for (const [convId, ids] of participantsByConv) {
        ids.sort();
      }

      const allUserIds = new Set<string>();
      for (const userIds of participantsByConv.values()) {
        for (const uid of userIds) allUserIds.add(uid);
      }

      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', [...allUserIds]);

      const profileMap = new Map<string, Profile>();
      for (const p of (allProfiles ?? []) as Profile[]) {
        profileMap.set(p.user_id, p);
      }

      const lastMsgByConv = new Map<string, Message>();
      await Promise.all(convIds.map(async (cid) => {
        const { data } = await supabase
          .from('messages')
          .select('id, conversation_id, content, created_at, sender_id, message_type, is_deleted, is_read, delivered_at, read_at, image_url, file_url, file_name, file_size, file_type, reply_to_id, is_edited, forwarded_from')
          .eq('conversation_id', cid)
          .order('created_at', { ascending: false })
          .limit(1);
        if (data?.[0]) {
          lastMsgByConv.set(cid, data[0] as Message);
        }
      }));

      const unreadCountMap = new Map<string, number>();
      for (const conv of convData) {
        const convParticipants = participantsByConv.get(conv.id) ?? [];
        const isGroup = convParticipants.length > 2;
        if (isGroup) {
          continue;
        }
        const partA = convParticipants.length >= 1 ? convParticipants[0] : null;
        const partB = convParticipants.length >= 2 ? convParticipants[1] : null;
        if (user.id === partA) {
          unreadCountMap.set(conv.id, conv.unread_count_a);
        } else if (user.id === partB) {
          unreadCountMap.set(conv.id, conv.unread_count_b);
        }
      }

      const groupConvIds = convData
        .filter(conv => (participantsByConv.get(conv.id) ?? []).length > 2)
        .map(conv => conv.id);
      if (groupConvIds.length > 0) {
        const { data: groupUnreadData } = await supabase
          .rpc('get_unread_counts', { p_user_id: user.id });
        for (const row of (groupUnreadData ?? []) as { conversation_id: string; count: number }[]) {
          unreadCountMap.set(row.conversation_id, Number(row.count));
        }
      }

      let enriched: Conversation[] = convData.map((conv) => {
        const convParticipantIds = participantsByConv.get(conv.id) ?? [];
        const isGroup = convParticipantIds.length > 2;
        const otherParticipantIds = convParticipantIds.filter(pid => pid !== user.id);
        const otherUser = otherParticipantIds.length > 0 ? profileMap.get(otherParticipantIds[0]) ?? null : null;
        const lastMsg = lastMsgByConv.get(conv.id) ?? null;
        const unreadCount = unreadCountMap.get(conv.id) ?? 0;
        const groupName = isGroup ? conv.group_name : undefined;
        const groupAvatar = isGroup ? conv.group_avatar : undefined;
        const participants = convParticipantIds
          .map(pid => profileMap.get(pid))
          .filter(Boolean) as Profile[];

        return {
          ...conv,
          other_user: otherUser,
          last_message: lastMsg,
          unread_count: unreadCount,
          is_group: isGroup,
          group_name: groupName,
          group_avatar: groupAvatar,
          participants,
          messages_policy: undefined,
          is_admin: undefined,
        };
      });
      enriched.sort((a, b) => {
        const aTime = a.last_message?.created_at;
        const bTime = b.last_message?.created_at;
        if (!aTime && !bTime) return 0;
        if (!aTime) return 1;
        if (!bTime) return -1;
        return bTime.localeCompare(aTime);
      });

      if (gen === fetchGenRef.current) {
        setConversations(enriched);
        setStaleUnread(false);
        const cacheCounts: Record<string, number> = {};
        let total = 0;
        for (const c of enriched) {
          cacheCounts[c.id] = c.unread_count;
          total += c.unread_count;
        }
        saveUnreadCache(cacheCounts, total);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      if (gen === fetchGenRef.current) {
        const cached = loadUnreadCache();
        if (cached && conversations.length > 0) {
          setConversations(prev => prev.map(c => ({
            ...c,
            unread_count: cached.counts[c.id] ?? c.unread_count,
          })));
        }
        if (cached && cached.total > 0) {
          setStaleUnread(true);
        }
      }
    }
    if (gen === fetchGenRef.current) {
      setLoading(false);
    }
  }, [user]);

  const fetchMessages = useCallback(async (conversationId: string, loadMore = false) => {
    const gen = ++messagesFetchGenRef.current;
    setMessagesLoading(true);
    if (!loadMore) {
      messagesCursorRef.current = null;
      setHasMoreMessages(true);
    }

    let query = supabase
      .from('messages')
      .select('id, conversation_id, content, created_at, sender_id, message_type, is_deleted, is_read, delivered_at, read_at, image_url, file_url, file_name, file_size, file_type, reply_to_id, is_edited, reactions, forwarded_from')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(MESSAGES_PAGE_SIZE);

    if (loadMore && messagesCursorRef.current) {
      const cursor = messagesCursorRef.current;
      query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
      setMessagesLoading(false);
      return;
    }

    if (gen !== messagesFetchGenRef.current) {
      setMessagesLoading(false);
      return;
    }

    const msgs = (data || []) as Message[];

    if (msgs.length < MESSAGES_PAGE_SIZE) {
      setHasMoreMessages(false);
    }

    if (msgs.length > 0) {
      const lastMsg = msgs[msgs.length - 1];
      messagesCursorRef.current = { created_at: lastMsg.created_at, id: lastMsg.id };
    }

    if (gen === messagesFetchGenRef.current) {
      setMessages(prev => {
        if (loadMore) {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = msgs.filter(m => !existingIds.has(m.id));
          return [...prev, ...newMsgs.reverse()].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        }
        return msgs.reverse();
      });
    }

    setMessagesLoading(false);

    if (user && !loadMore) {
      enqueueMarkRead(conversationId, user.id);
    }
  }, [user, enqueueMarkRead]);

  const loadMoreMessages = useCallback(() => {
    if (!activeConversation || loadingMore || !hasMoreMessages) return;
    setLoadingMore(true);
    fetchMessages(activeConversation, true).finally(() => setLoadingMore(false));
  }, [activeConversation, loadingMore, hasMoreMessages, fetchMessages]);

  useEffect(() => {
    if (!user) return;

    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout>;
    let disposed = false;

    const createGlobalChannel = () => {
      if (disposed) return;

      const channel = supabase
        .channel(`chat-global-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const newMsg = payload.new as Message;
            setGlobalInsertCount(prev => prev + 1);
            debug('[Realtime] chat-global INSERT:', newMsg.id, 'conv:', newMsg.conversation_id, 'sender:', newMsg.sender_id);
            if (newMsg.sender_id === user.id) return;

            window.dispatchEvent(new CustomEvent('chat-new-message', {
              detail: { message: newMsg },
            }));

            if (!convIdsRef.current.includes(newMsg.conversation_id)) return;

            const currentConv = activeConvRef.current;
            if (newMsg.conversation_id === currentConv) {
              setMessages(prev =>
                prev.some(m => m.id === newMsg.id)
                  ? prev
                  : [...prev, newMsg].sort(
                      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    )
              );
            }
            setConversations(prev => {
              const updated = prev.map(c =>
                c.id === newMsg.conversation_id
                  ? { ...c, unread_count: c.id === currentConv ? 0 : c.unread_count + 1, last_message: newMsg }
                  : c
              );
              return updated.sort((a, b) => {
                const aTime = a.last_message?.created_at;
                const bTime = b.last_message?.created_at;
                if (!aTime && !bTime) return 0;
                if (!aTime) return 1;
                if (!bTime) return -1;
                return bTime.localeCompare(aTime);
              });
            });
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'messages' },
          (payload) => {
            const oldMsg = payload.old as { conversation_id: string; sender_id: string; is_read: boolean };
            if (oldMsg.sender_id === user.id) return;
            if (!oldMsg.is_read) {
              setConversations(prev => prev.map(c =>
                c.id === oldMsg.conversation_id && c.unread_count > 0
                  ? { ...c, unread_count: c.unread_count - 1 }
                  : c
              ));
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages' },
          (payload) => {
            const newMsg = payload.new as Message & { is_deleted: boolean };
            const oldMsg = payload.old as Message & { is_deleted: boolean };
            if (!convIdsRef.current.includes(newMsg.conversation_id)) return;
            if (newMsg.is_deleted && !oldMsg.is_deleted && !newMsg.is_read) {
              setConversations(prev => prev.map(c =>
                c.id === newMsg.conversation_id && c.unread_count > 0
                  ? { ...c, unread_count: c.unread_count - 1 }
                  : c
              ));
            }
            if (newMsg.conversation_id === activeConvRef.current) {
              setMessages(prev => prev.map(m =>
                m.id === newMsg.id
                  ? { ...m, is_read: newMsg.is_read, read_at: newMsg.read_at, delivered_at: newMsg.delivered_at, is_deleted: newMsg.is_deleted, content: newMsg.is_deleted ? '' : newMsg.content }
                  : m
              ));
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${user.id}` },
          () => {
            fetchConversations();
          }
        )
        .subscribe((status, err) => {
          setGlobalChannelStatus(status);
          debug('[Realtime] chat-global status:', status);
          if (status === 'SUBSCRIBED') {
            retryCount = 0;
            fetchConversations();
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[useChat] global channel error:', err);
            const delay = Math.min(3000 * Math.pow(2, retryCount), 30000);
            retryCount++;
            clearTimeout(retryTimer);
            retryTimer = setTimeout(() => {
              supabase.removeChannel(channel);
              createGlobalChannel();
            }, delay);
          } else if (status === 'CLOSED') {
            debugWarn('[realtime] chat-global channel closed');
          } else {
            debugWarn('[realtime] chat-global status:', status, err);
          }
        });

      return channel;
    };

    const globalChannel = createGlobalChannel();

    const msgBroadcast = supabase
      .channel('msg-broadcast', { selfBroadcast: false })
      .on('broadcast', { event: 'msg' }, (payload) => {
        const newMsg = payload.payload.message as Message;
        if (newMsg.sender_id === user.id) return;
        if (!convIdsRef.current.includes(newMsg.conversation_id)) {
          void fetchConversations().then(() => {
            if (convIdsRef.current.includes(newMsg.conversation_id)) {
              const currentConv = activeConvRef.current;
              if (newMsg.conversation_id === currentConv) {
                setMessages(prev =>
                  prev.some(m => m.id === newMsg.id)
                    ? prev
                    : [...prev, newMsg].sort(
                        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                      )
                );
                setConversations(prev => prev.map(c =>
                  c.id === newMsg.conversation_id ? { ...c, unread_count: 0, last_message: newMsg as Message } : c
                ));
              } else {
                setConversations(prev => prev.map(c =>
                  c.id === newMsg.conversation_id
                    ? { ...c, unread_count: c.unread_count + 1, last_message: newMsg as Message }
                    : c
                ));
              }
            }
          });
          return;
        }
        const currentConv = activeConvRef.current;
        if (newMsg.conversation_id === currentConv) {
          setMessages(prev =>
            prev.some(m => m.id === newMsg.id)
              ? prev
              : [...prev, newMsg].sort(
                  (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )
          );
          setConversations(prev => prev.map(c =>
            c.id === newMsg.conversation_id ? { ...c, unread_count: 0, last_message: newMsg as Message } : c
          ));
        } else {
          setConversations(prev => prev.map(c =>
            c.id === newMsg.conversation_id
              ? { ...c, unread_count: c.unread_count + 1, last_message: newMsg as Message }
              : c
          ));
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          msgBroadcastRef.current = msgBroadcast;
        } else if (status === 'CHANNEL_ERROR') {
          debugWarn('[realtime] msg-broadcast error');
        } else if (status === 'CLOSED') {
          debugWarn('[realtime] msg-broadcast closed');
        }
      });
    msgBroadcastRef.current = msgBroadcast;

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      supabase.removeChannel(globalChannel);
      supabase.removeChannel(msgBroadcast);
      msgBroadcastRef.current = null;
    };
  }, [user, fetchConversations]);

  // Polling fallback for when Realtime/WebSocket is unavailable
  useEffect(() => {
    if (!user) return;

    const shouldPoll = globalChannelStatus === 'CHANNEL_ERROR' || globalChannelStatus === 'CLOSED' || globalChannelStatus === 'TIMED_OUT';
    const shouldStop = globalChannelStatus === 'SUBSCRIBED' || globalChannelStatus === 'idle';

    if (shouldStop) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = undefined;
      pollCursorRef.current = '';
      return;
    }

    if (!shouldPoll) return;

    clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      // Initialize cursor only when conversations are loaded
      if (!pollCursorRef.current) {
        const convs = conversationsRef.current;
        if (convs.length === 0) return;
        const latestTs = convs.reduce((latest, c) => {
          if (!c.last_message?.created_at) return latest;
          return c.last_message.created_at > latest ? c.last_message.created_at : latest;
        }, '');
        pollCursorRef.current = latestTs || new Date().toISOString();
        return;
      }

      const convIds = convIdsRef.current;
      if (convIds.length === 0) return;

      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id, conversation_id, content, created_at, sender_id, message_type, is_deleted, is_read, delivered_at, read_at, image_url, file_url, file_name, file_size, file_type, reply_to_id, is_edited, forwarded_from')
          .in('conversation_id', convIds)
          .gt('created_at', pollCursorRef.current)
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (!data || data.length === 0) return;

        pollCursorRef.current = data[data.length - 1].created_at;

        for (const newMsg of data) {
          if (newMsg.sender_id === user.id) continue;

          const currentConv = activeConvRef.current;
          if (newMsg.conversation_id === currentConv) {
            setMessages(prev =>
              prev.some(m => m.id === newMsg.id)
                ? prev
                : [...prev, newMsg as Message].sort(
                    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                  )
            );
          }
          setConversations(prev => {
            const updated = prev.map(c =>
              c.id === newMsg.conversation_id
                ? { ...c, unread_count: c.id === currentConv ? 0 : c.unread_count + 1, last_message: newMsg as Message }
                : c
            );
            return updated.sort((a, b) => {
              const aTime = a.last_message?.created_at;
              const bTime = b.last_message?.created_at;
              if (!aTime && !bTime) return 0;
              if (!aTime) return 1;
              if (!bTime) return -1;
              return bTime.localeCompare(aTime);
            });
          });

          window.dispatchEvent(new CustomEvent('chat-new-message', {
            detail: { message: newMsg },
          }));
        }
      } catch (err) {
        debugWarn('[useChat] poll fallback error:', err);
      }
    }, 3000);

    return () => {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = undefined;
    };
  }, [user, globalChannelStatus]);

  useEffect(() => {
    try {
      const bc = new BroadcastChannel(CROSS_TAB_CHANNEL);
      broadcastRef.current = bc;
      bc.onmessage = (event) => {
        if (event.data?.type === 'read') {
          setConversations(prev => prev.map(c =>
            c.id === event.data.conversationId ? { ...c, unread_count: 0 } : c
          ));
        }
      };
    } catch { /* BroadcastChannel not available */ }
    return () => { broadcastRef.current?.close(); };
  }, []);

  // Read receipts polling — polls own messages in active conversation for is_read updates
  // Realtime UPDATE handler (line ~542) is the primary path, but it can be unreliable.
  // This ensures the blue checkmark always updates within 5s.
  useEffect(() => {
    if (!user) return;

    readReceiptPollRef.current = setInterval(async () => {
      const convId = activeConvRef.current;
      if (!convId) return;

      try {
        const { data } = await supabase
          .from('messages')
          .select('id, is_read, read_at, delivered_at')
          .eq('conversation_id', convId)
          .eq('sender_id', user.id)
          .neq('is_read', true)
          .limit(30);

        if (data && data.length > 0) {
          setMessages(prev => prev.map(m => {
            const update = data.find(d => d.id === m.id);
            if (update && (update.is_read !== m.is_read || update.read_at !== m.read_at || update.delivered_at !== m.delivered_at)) {
              return { ...m, is_read: update.is_read, read_at: update.read_at, delivered_at: update.delivered_at };
            }
            return m;
          }));
        }
      } catch {
        // silent — don't spam console
      }
    }, 5000);

    return () => {
      clearInterval(readReceiptPollRef.current);
    };
  }, [user]);

  const openConversation = useCallback(async (conversationId: string) => {
    setActiveConversation(conversationId);
    setMessages([]);
    setHasMoreMessages(true);
    messagesCursorRef.current = null;
    await fetchMessages(conversationId);
    fetchConversations();
  }, [fetchMessages, fetchConversations]);

  const trySendItem = useCallback(async (item: OfflineItem): Promise<boolean> => {
    if (!user) return false;
    if (item.kind === 'text') {
      const { data, error } = await supabase.from('messages').insert({
        conversation_id: item.conversationId,
        content: item.content.trim(),
        message_type: 'text',
        reply_to_id: item.replyToId || null,
        client_msg_id: crypto.randomUUID(),
      }).select();
      if (error) return false;
      if (data?.[0]) {
        msgBroadcastRef.current?.send({
          type: 'broadcast', event: 'msg', payload: { message: data[0] },
        });
      }
      return true;
    }
    if (item.kind === 'image') {
      const { data, error } = await supabase.from('messages').insert({
        conversation_id: item.conversationId,
        content: '',
        message_type: 'image',
        image_url: item.imageUrl,
        client_msg_id: crypto.randomUUID(),
      }).select();
      if (error) return false;
      if (data?.[0]) {
        msgBroadcastRef.current?.send({
          type: 'broadcast', event: 'msg', payload: { message: data[0] },
        });
      }
      return true;
    }
    if (item.kind === 'file') {
      const mt = item.fileType.startsWith('video/') ? 'video' : item.fileType.startsWith('audio/') ? 'audio' : 'file';
      const { data, error } = await supabase.from('messages').insert({
        conversation_id: item.conversationId,
        content: item.fileName,
        message_type: mt,
        file_url: item.fileUrl,
        file_name: item.fileName,
        file_size: item.fileSize,
        file_type: item.fileType,
        client_msg_id: crypto.randomUUID(),
      }).select();
      if (error) return false;
      if (data?.[0]) {
        msgBroadcastRef.current?.send({
          type: 'broadcast', event: 'msg', payload: { message: data[0] },
        });
      }
      return true;
    }
    return false;
  }, [user]);

  const flushOfflineQueue = useCallback(async () => {
    if (!user || offlineQueueRef.current.length === 0) return;
    const queue = [...offlineQueueRef.current];
    offlineQueueRef.current = [];
    setPendingCount(0);
    const results = await Promise.allSettled(
      queue.map(item => trySendItem(item))
    );
    const failed = queue.filter((_, i) => results[i].status === 'rejected' || results[i].value === false);
    if (failed.length > 0) {
      offlineQueueRef.current = failed;
      setPendingCount(failed.length);
      toast.error(`${failed.length} messages pending — still offline`);
    } else {
      toast.success('Messages sent!');
    }
  }, [user, trySendItem]);

  const sendMessage = useCallback(async (content: string, replyToId?: string | null) => {
    if (!user || !activeConversation || !content.trim()) return;

    const optimisticMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: activeConversation,
      sender_id: user.id,
      content: content.trim(),
      created_at: new Date().toISOString(),
      is_read: false,
      message_type: 'text',
      reply_to_id: replyToId || null,
    };

    setMessages(prev => [...prev, optimisticMsg]);

    if (!navigator.onLine) {
      offlineQueueRef.current.push({ kind: 'text', conversationId: activeConversation, content: content.trim(), replyToId });
      setPendingCount(offlineQueueRef.current.length);
      return;
    }

    const { data, error } = await supabase.from('messages').insert({
      conversation_id: activeConversation,
      sender_id: user.id,
      content: content.trim(),
      message_type: 'text',
      reply_to_id: replyToId || null,
    }).select();

    if (error) {
      offlineQueueRef.current.push({ kind: 'text', conversationId: activeConversation, content: content.trim(), replyToId });
      setPendingCount(offlineQueueRef.current.length);
      toast.info('Message queued — will send when back online');
      return;
    }

    if (data?.[0]) {
      setMessages(prev => prev.map(m =>
        m.id === optimisticMsg.id ? { ...data[0], reactions: undefined } as Message : m
      ));
      msgBroadcastRef.current?.send({
        type: 'broadcast',
        event: 'msg',
        payload: { message: data[0] },
      });
    }
  }, [user, activeConversation]);

  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!user || !newContent.trim()) return;

    const prevMessages = messagesRef.current;
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: newContent.trim(), is_edited: true } : m));

    const { error } = await supabase
      .from('messages')
      .update({ content: newContent.trim(), is_edited: true })
      .eq('id', messageId)
      .eq('sender_id', user.id);

    if (error) {
      setMessages(prevMessages);
      toast.error('Edit failed');
    }
  }, [user]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!user) return;

    const prevMessages = messagesRef.current;
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: true, content: '' } : m));

    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', messageId)
      .eq('sender_id', user.id);

    if (error) {
      setMessages(prevMessages);
      toast.error('Delete failed');
    }
  }, [user]);

  const sendImage = useCallback(async (imageUrl: string) => {
    if (!user || !activeConversation || !imageUrl.trim()) return;

    const optimisticMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: activeConversation,
      sender_id: user.id,
      content: '',
      created_at: new Date().toISOString(),
      is_read: false,
      message_type: 'image',
      image_url: imageUrl,
    };

    setMessages(prev => [...prev, optimisticMsg]);

    if (!navigator.onLine) {
      offlineQueueRef.current.push({ kind: 'image', conversationId: activeConversation, imageUrl });
      setPendingCount(offlineQueueRef.current.length);
      return;
    }

    const { data, error } = await supabase.from('messages').insert({
      conversation_id: activeConversation,
      sender_id: user.id,
      content: '',
      message_type: 'image',
      image_url: imageUrl,
    }).select();

    if (error) {
      toast.error(`Send error: ${error.message}`);
      return;
    }

    if (data?.[0]) {
      setMessages(prev => prev.map(m =>
        m.id === optimisticMsg.id ? { ...data[0], reactions: undefined } as Message : m
      ));
      msgBroadcastRef.current?.send({
        type: 'broadcast',
        event: 'msg',
        payload: { message: data[0] },
      });
    }
  }, [user, activeConversation]);

  const sendFile = useCallback(async (fileUrl: string, fileName: string, fileSize: number, fileType: string) => {
    if (!user || !activeConversation) return;

    const optimisticMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: activeConversation,
      sender_id: user.id,
      content: fileName,
      created_at: new Date().toISOString(),
      is_read: false,
      message_type: fileType.startsWith('video/') ? 'video' : fileType.startsWith('audio/') ? 'audio' : 'file',
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
    };

    setMessages(prev => [...prev, optimisticMsg]);

    if (!navigator.onLine) {
      offlineQueueRef.current.push({ kind: 'file', conversationId: activeConversation, fileUrl, fileName, fileSize, fileType });
      setPendingCount(offlineQueueRef.current.length);
      return;
    }

    const { data, error } = await supabase.from('messages').insert({
      conversation_id: activeConversation,
      sender_id: user.id,
      content: fileName,
      message_type: fileType.startsWith('video/') ? 'video' : fileType.startsWith('audio/') ? 'audio' : 'file',
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
    }).select();

    if (error) {
      offlineQueueRef.current.push({ kind: 'file', conversationId: activeConversation, fileUrl, fileName, fileSize, fileType });
      setPendingCount(offlineQueueRef.current.length);
      toast.info('File queued — will send when back online');
      return;
    }

    if (data?.[0]) {
      setMessages(prev => prev.map(m =>
        m.id === optimisticMsg.id ? { ...data[0], reactions: undefined } as Message : m
      ));
      msgBroadcastRef.current?.send({
        type: 'broadcast',
        event: 'msg',
        payload: { message: data[0] },
      });
    }
  }, [user, activeConversation]);

  const sendReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;

    const msg = messagesRef.current.find(m => m.id === messageId);
    if (!msg) return;

    const current = msg.reactions || {};
    const existingUsers = current[emoji] || [];
    const hasReacted = existingUsers.includes(user.id);

    const updated = { ...current };
    if (hasReacted) {
      updated[emoji] = existingUsers.filter(uid => uid !== user.id);
      if (updated[emoji].length === 0) delete updated[emoji];
    } else {
      updated[emoji] = [...existingUsers, user.id];
    }

    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: updated } : m));

    const { error } = await supabase.from('messages').update({ reactions: updated }).eq('id', messageId);
    if (error) {
      console.error('Reaction update error:', error);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: current } : m));
      toast.error('Reaction failed');
    }
  }, [user]);

  const forwardMessage = useCallback(async (messageId: string, targetConversationId: string) => {
    if (!user || !activeConversation) return;
    const msg = messagesRef.current.find(m => m.id === messageId);
    if (!msg) return;

    const senderProfile = messagesRef.current
      .filter(m => m.sender_id === msg.sender_id)
      .find(() => true);
    let senderName: string | null = null;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', msg.sender_id)
        .single();
      senderName = (data as { display_name: string | null } | null)?.display_name ?? null;
    } catch { /* profile lookup failed */ }

    const forwardedFrom = {
      message_id: msg.id,
      sender_id: msg.sender_id,
      sender_name: senderName,
      conversation_id: activeConversation,
      forwarded_at: new Date().toISOString(),
    };

    const optimisticMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: targetConversationId,
      sender_id: user.id,
      content: msg.content || '',
      created_at: new Date().toISOString(),
      is_read: false,
      message_type: msg.message_type === 'image' ? 'image' : msg.message_type === 'video' ? 'video' : msg.message_type === 'audio' ? 'audio' : 'text',
      image_url: msg.image_url,
      file_url: msg.file_url,
      file_name: msg.file_name,
      file_size: msg.file_size,
      file_type: msg.file_type,
      forwarded_from: forwardedFrom,
    };

    if (targetConversationId === activeConversation) {
      setMessages(prev => [...prev, optimisticMsg]);
    }

    const { data, error } = await supabase.from('messages').insert({
      conversation_id: targetConversationId,
      sender_id: user.id,
      content: msg.content || '',
      message_type: msg.message_type === 'image' ? 'image' : msg.message_type === 'video' ? 'video' : msg.message_type === 'audio' ? 'audio' : 'text',
      image_url: msg.image_url,
      file_url: msg.file_url,
      file_name: msg.file_name,
      file_size: msg.file_size,
      file_type: msg.file_type,
      forwarded_from: forwardedFrom,
    }).select();

    if (error) {
      offlineQueueRef.current.push({ kind: 'image', conversationId: activeConversation, imageUrl });
      setPendingCount(offlineQueueRef.current.length);
      toast.info('Image queued — will send when back online');
      return;
    }

    if (data?.[0]) {
      if (targetConversationId === activeConversation) {
        setMessages(prev => prev.map(m =>
          m.id === optimisticMsg.id ? { ...data[0], reactions: undefined } as Message : m
        ));
      }
      msgBroadcastRef.current?.send({
        type: 'broadcast',
        event: 'msg',
        payload: { message: data[0] },
      });
    }

    void fetchConversations();
  }, [user, activeConversation]);

  const startConversation = useCallback(async (otherUserId: string): Promise<string | null> => {
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .rpc('find_or_create_dm', { other_user_id: otherUserId });

    if (error) throw new Error(error.message);
    const result = data as { conversation_id?: string; error?: string };
    if (result?.error) throw new Error(result.error);
    if (!result?.conversation_id) throw new Error('Failed to create conversation');

    const convId = result.conversation_id;
    await fetchConversations();
    await openConversation(convId);
    return convId;
  }, [user, openConversation, fetchConversations]);

  const deleteConversation = useCallback(async (conversationId: string): Promise<(() => Promise<void>) | undefined> => {
    if (!user) return;

    const conv = conversationsRef.current.find(c => c.id === conversationId);

    setConversations(prev => prev.filter(c => c.id !== conversationId));
    if (activeConvRef.current === conversationId) {
      setActiveConversation(null);
      setMessages([]);
    }

    const { error } = await supabase
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    if (error) {
      if (conv) setConversations(prev => [...prev, conv]);
      toast.error('Failed to delete conversation');
      return;
    }

    return async () => {
      const { error: rejoinErr } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          last_read_at: new Date().toISOString(),
        });
      if (rejoinErr) {
        toast.error('Undo failed');
        return;
      }
      void fetchConversations();
    };
  }, [user, fetchConversations]);

  const searchUsers = useCallback(async (query: string): Promise<Profile[]> => {
    if (!user || !query.trim()) return [];

    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .neq('user_id', user.id)
        .ilike('display_name', `%${query}%`)
        .limit(10);

      return data || [];
    } catch (err) {
      console.error('User search failed:', err);
      return [];
    }
  }, [user]);

  const uploadFile = useCallback(async (file: File): Promise<{ url: string | null; error: string | null }> => {
    if (!user) return { url: null, error: 'Not authenticated' };

    const ext = file.name.split('.').pop();
    const fileName = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { data, error } = await supabase.storage
      .from('chat-files')
      .upload(fileName, file, {
        contentType: file.type,
      });

    if (error) return { url: null, error: error.message };

    const publicUrl = supabase.storage
      .from('chat-files')
      .getPublicUrl(data.path).data?.publicUrl ?? null;

    return { url: publicUrl, error: null };
  }, [user]);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null;

    const ext = file.name.split('.').pop();
    const fileName = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { data, error } = await supabase.storage
      .from('chat-images')
      .upload(fileName, file, {
        contentType: file.type,
      });

    if (error) { console.error('Upload error:', error); toast.error('Image upload failed: ' + error.message); return null; }

    const publicUrl = supabase.storage
      .from('chat-images')
      .getPublicUrl(data.path).data?.publicUrl ?? null;

    return publicUrl;
  }, [user]);

  useEffect(() => {
    fetchConversations();
    const onOnline = () => {
      fetchConversations();
      if (offlineQueueRef.current.length > 0) {
        flushOfflineQueue();
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [fetchConversations, flushOfflineQueue]);

  const pushMessage = useCallback((message: Message) => {
    setMessages(prev => {
      if (prev.some(m => m.id === message.id)) return prev;
      return [...prev, message].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, []);

  return {
    conversations,
    activeConversation,
    messages,
    loading,
    messagesLoading,
    hasMoreMessages,
    loadingMore,
    loadMoreMessages,
    openConversation,
    sendMessage,
    forwardMessage,
    editMessage,
    deleteMessage,
    sendImage,
    sendFile,
    sendReaction,
    startConversation,
    deleteConversation,
    searchUsers,
    uploadImage,
    uploadFile,
    setActiveConversation,
    fetchConversations,
    totalUnreadCount,
    markingRead,
    staleUnread,
    pushMessage,
    globalChannelStatus,
    globalInsertCount,
    pendingCount,
    flushOfflineQueue,
  };
}

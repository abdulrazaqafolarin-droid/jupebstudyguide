import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const CROSS_TAB_CHANNEL = 'jupeb-unread-sync';
const MAX_RETRIES = 3;
const UNREAD_CACHE_KEY = 'jupeb-unread-cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
  id: string;
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
  participants?: Profile[];
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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fetchGenRef = useRef(0);
  const messagesCursorRef = useRef<string | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const [markingRead, setMarkingRead] = useState<Set<string>>(new Set());
  const [staleUnread, setStaleUnread] = useState(false);
  const markReadQueue = useRef<Array<{ conversationId: string; userId: string; resolve: () => void }>>([]);
  const markReadProcessing = useRef(false);

  // --- Broadcast helper (declared first — avoid TDZ) ---
  const broadcastRead = useCallback((conversationId: string) => {
    try {
      broadcastRef.current?.postMessage({ type: 'read', conversationId });
    } catch { /* silently fail */ }
  }, []);

  // --- Mark-read queue (EDGE-3) ---
  const processMarkReadQueue = useCallback(async () => {
    if (markReadProcessing.current) return;
    markReadProcessing.current = true;
    while (markReadQueue.current.length > 0) {
      const item = markReadQueue.current.shift()!;
      try {
        await retryWithBackoff(() =>
          supabase
            .rpc('mark_conversation_read', {
              p_conversation_id: item.conversationId,
              p_user_id: item.userId,
            })
            .then(({ data, error }) => { if (error) throw error; return data; }),
        );
        setConversations(prev => prev.map(c =>
          c.id === item.conversationId ? { ...c, unread_count: 0 } : c
        ));
        broadcastRead(item.conversationId);
      } catch (err) {
        console.error('Mark-read failed after retries, badge unchanged:', err);
        toast.error('Failed to mark messages as read');
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
      markReadQueue.current.push({ conversationId, userId, resolve });
      processMarkReadQueue();
    });
  }, [processMarkReadQueue]);

  // --- Unread cache helpers (EDGE-1) ---
  const saveUnreadCache = useCallback((counts: Record<string, number>) => {
    try {
      localStorage.setItem(UNREAD_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        counts,
      }));
    } catch { /* storage full or unavailable */ }
  }, []);

  const loadUnreadCache = useCallback((): Record<string, number> | null => {
    try {
      const raw = localStorage.getItem(UNREAD_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
      return parsed.counts ?? null;
    } catch { return null; }
  }, []);

  const totalUnreadCount = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unread_count, 0),
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

      const { data: convData } = await supabase
        .from('conversations')
        .select('*')
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
      // Sort participants so a=LEAST, b=GREATEST matches DB trigger order
      for (const [convId, ids] of participantsByConv) {
        ids.sort();
      }

      const allUserIds = new Set<string>();
      for (const userIds of participantsByConv.values()) {
        for (const uid of userIds) allUserIds.add(uid);
      }

      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', [...allUserIds]);

      const profileMap = new Map<string, Profile>();
      for (const p of (allProfiles ?? []) as Profile[]) {
        profileMap.set(p.user_id, p);
      }

      const { data: allLastMsgs } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false });

      const lastMsgByConv = new Map<string, Message>();
      for (const msg of (allLastMsgs ?? []) as Message[]) {
        if (!lastMsgByConv.has(msg.conversation_id)) {
          lastMsgByConv.set(msg.conversation_id, msg);
        }
      }

      // Build unread count from stored unread_count_a/b on conversation row
      // a = LEAST participant, b = GREATEST participant
      const unreadCountMap = new Map<string, number>();
      for (const conv of convData) {
        const convParticipants = participantsByConv.get(conv.id) ?? [];
        const isGroup = convParticipants.length > 2;
        if (isGroup) {
          // Groups: use RPC fallback
          continue;
        }
        const partA = convParticipants.length >= 1 ? convParticipants[0] : null;
        const partB = convParticipants.length >= 2 ? convParticipants[1] : null;
        const typedConv = conv as Record<string, unknown>;
        if (user.id === partA) {
          unreadCountMap.set(conv.id, Number(typedConv.unread_count_a ?? 0));
        } else if (user.id === partB) {
          unreadCountMap.set(conv.id, Number(typedConv.unread_count_b ?? 0));
        }
      }

      // For group conversations (3+ participants), fetch via RPC
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

      const { data: groupNameData } = await supabase
        .from('messages')
        .select('conversation_id, group_name')
        .in('conversation_id', convIds)
        .not('group_name', 'is', null)
        .order('created_at', { ascending: true });

      const groupNameByConv = new Map<string, string>();
      for (const msg of (groupNameData ?? []) as { conversation_id: string; group_name: string }[]) {
        if (!groupNameByConv.has(msg.conversation_id)) {
          groupNameByConv.set(msg.conversation_id, msg.group_name);
        }
      }

      const enriched: Conversation[] = convData.map((conv) => {
        const convParticipantIds = participantsByConv.get(conv.id) ?? [];
        const isGroup = convParticipantIds.length > 2;
        const otherParticipantIds = convParticipantIds.filter(pid => pid !== user.id);
        const otherUser = otherParticipantIds.length > 0 ? profileMap.get(otherParticipantIds[0]) ?? null : null;
        const lastMsg = lastMsgByConv.get(conv.id) ?? null;
        const unreadCount = unreadCountMap.get(conv.id) ?? 0;
        const groupName = isGroup ? groupNameByConv.get(conv.id) : undefined;

        return {
          ...conv,
          other_user: otherUser,
          last_message: lastMsg,
          unread_count: unreadCount,
          is_group: isGroup,
          group_name: groupName,
        };
      });

      if (gen === fetchGenRef.current) {
        setConversations(enriched);
        setStaleUnread(false);
        // EDGE-1: persist unread counts to localStorage
        const cacheCounts: Record<string, number> = {};
        for (const c of enriched) {
          cacheCounts[c.id] = c.unread_count;
        }
        saveUnreadCache(cacheCounts);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      // EDGE-1: fall back to cached counts
      if (gen === fetchGenRef.current) {
        const cached = loadUnreadCache();
        if (cached) {
          setConversations(prev => prev.map(c => ({
            ...c,
            unread_count: cached[c.id] ?? c.unread_count,
          })));
          setStaleUnread(true);
        }
      }
    }
    if (gen === fetchGenRef.current) {
      setLoading(false);
    }
  }, [user]);

  const fetchMessages = useCallback(async (conversationId: string, loadMore = false) => {
    setMessagesLoading(true);
    if (!loadMore) {
      messagesCursorRef.current = null;
      setHasMoreMessages(true);
    }

    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PAGE_SIZE);

    if (loadMore && messagesCursorRef.current) {
      query = query.lt('created_at', messagesCursorRef.current);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      setMessagesLoading(false);
      return;
    }

    const msgs = (data || []) as Message[];

    if (msgs.length < MESSAGES_PAGE_SIZE) {
      setHasMoreMessages(false);
    }

    if (msgs.length > 0) {
      const lastMsg = msgs[msgs.length - 1];
      messagesCursorRef.current = lastMsg.created_at;
    }

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

    setMessagesLoading(false);

    // EDGE-3: Enqueue mark-read (non-blocking, processed in order)
    if (user && !loadMore) {
      enqueueMarkRead(conversationId, user.id);
    }
  }, [user, enqueueMarkRead]);

  const loadMoreMessages = useCallback(() => {
    if (!activeConversation || loadingMore || !hasMoreMessages) return;
    setLoadingMore(true);
    fetchMessages(activeConversation, true).finally(() => setLoadingMore(false));
  }, [activeConversation, loadingMore, hasMoreMessages, fetchMessages]);

  // Global listener — real-time unread count updates
  useEffect(() => {
    if (!user) return;

    const globalChannel = supabase
      .channel('chat-global')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === user.id) return;
          if (newMsg.message_type === 'system') return;
          // EDGE-7: first message in a new conversation — re-fetch to pick it up
          if (!convIdsRef.current.includes(newMsg.conversation_id)) {
            fetchConversations();
            return;
          }

          if (newMsg.conversation_id === activeConversation) {
            setMessages(prev => [...prev, newMsg]);
            setConversations(prev => prev.map(c =>
              c.id === newMsg.conversation_id ? { ...c, unread_count: 0 } : c
            ));
            supabase.from('messages').update({
              is_read: true,
              delivered_at: new Date().toISOString(),
              read_at: new Date().toISOString(),
            }).eq('id', newMsg.id).then().catch(() => {});
          } else {
            setConversations(prev => prev.map(c =>
              c.id === newMsg.conversation_id
                ? { ...c, unread_count: c.unread_count + 1 }
                : c
            ));
            supabase.from('messages').update({
              delivered_at: new Date().toISOString(),
            }).eq('id', newMsg.id).then().catch(() => {});
          }
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
          if (newMsg.sender_id === user.id) return;
          if (!convIdsRef.current.includes(newMsg.conversation_id)) return;
          if (newMsg.is_deleted && !oldMsg.is_deleted && !newMsg.is_read) {
            setConversations(prev => prev.map(c =>
              c.id === newMsg.conversation_id && c.unread_count > 0
                ? { ...c, unread_count: c.unread_count - 1 }
                : c
            ));
          }
          if (newMsg.conversation_id === activeConversation) {
            setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, ...newMsg } : m));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Re-fetch on reconnect to prevent drift during offline periods
          fetchConversations();
        }
      });

    return () => { supabase.removeChannel(globalChannel); };
  }, [user, activeConversation]);

  // Cross-tab BroadcastChannel sync
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

  const openConversation = useCallback(async (conversationId: string) => {
    setActiveConversation(conversationId);
    setMessages([]);
    setHasMoreMessages(true);
    messagesCursorRef.current = null;
    await fetchMessages(conversationId);
    fetchConversations();
  }, [fetchMessages, fetchConversations]);

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

    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConversation,
      sender_id: user.id,
      content: content.trim(),
      reply_to_id: replyToId || null,
    });

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      toast.error(`Send error: ${error.message}`);
      return;
    }

    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversation).catch(() => {});
  }, [user, activeConversation]);

  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!user || !newContent.trim()) return;

    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: newContent.trim(), is_edited: true } : m));

    const { error } = await supabase
      .from('messages')
      .update({ content: newContent.trim(), is_edited: true })
      .eq('id', messageId)
      .eq('sender_id', user.id);

    if (error) {
      toast.error('Edit failed');
    }
  }, [user]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!user) return;

    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: true, content: '' } : m));

    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', messageId)
      .eq('sender_id', user.id);

    if (error) {
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

    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConversation,
      sender_id: user.id,
      content: '',
      image_url: imageUrl,
    });

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      toast.error(`Send error: ${error.message}`);
      return;
    }

    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversation).catch(() => {});
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

    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConversation,
      sender_id: user.id,
      content: fileName,
      message_type: fileType.startsWith('video/') ? 'video' : fileType.startsWith('audio/') ? 'audio' : 'file',
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
    });

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      toast.error(`File send error: ${error.message}`);
    }
  }, [user, activeConversation]);

  const sendReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;

    const msg = messages.find(m => m.id === messageId);
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

    await supabase.from('messages').update({ reactions: updated }).eq('id', messageId).catch(() => {});
  }, [user, messages]);

  const startConversation = useCallback(async (otherUserId: string): Promise<string | null> => {
    if (!user) throw new Error('Not authenticated');

    const { data: myParticipations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (myParticipations?.length) {
      const convIds = myParticipations.map(p => p.conversation_id);
      const { data: otherParticipations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', otherUserId)
        .in('conversation_id', convIds);

      if (otherParticipations?.length) {
        const existingConvId = otherParticipations[0].conversation_id;
        await openConversation(existingConvId);
        return existingConvId;
      }
    }

    const convId = crypto.randomUUID();
    const { error: convError } = await supabase
      .from('conversations')
      .insert({ id: convId });
    if (convError) throw new Error(convError.message);

    await supabase.from('conversation_participants').insert(
      { conversation_id: convId, user_id: user.id }
    );

    await supabase.from('conversation_participants').insert(
      { conversation_id: convId, user_id: otherUserId }
    );

    await fetchConversations();
    await openConversation(convId);
    return convId;
  }, [user, openConversation, fetchConversations]);

  const searchUsers = useCallback(async (query: string): Promise<Profile[]> => {
    if (!user || !query.trim()) return [];

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('user_id', user.id)
      .ilike('display_name', `%${query}%`)
      .limit(10);

    return data || [];
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

    const { data: { publicUrl } } = supabase.storage
      .from('chat-files')
      .getPublicUrl(data.path);

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

    if (error) { console.error('Upload error:', error); return null; }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-images')
      .getPublicUrl(data.path);

    return publicUrl;
  }, [user]);

  useEffect(() => {
    fetchConversations();
    // EDGE-1: also refetch when browser reports connectivity restored
    const onOnline = () => { fetchConversations(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [fetchConversations]);

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
    editMessage,
    deleteMessage,
    sendImage,
    sendFile,
    sendReaction,
    startConversation,
    searchUsers,
    uploadImage,
    uploadFile,
    setActiveConversation,
    fetchConversations,
    totalUnreadCount,
    markingRead,
    staleUnread,
  };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

      const { data: unreadData } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .eq('is_read', false)
        .neq('sender_id', user.id);

      const unreadCountMap = new Map<string, number>();
      for (const msg of (unreadData ?? []) as { conversation_id: string }[]) {
        unreadCountMap.set(msg.conversation_id, (unreadCountMap.get(msg.conversation_id) ?? 0) + 1);
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
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
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

    // Mark as read
    if (user && !loadMore) {
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false);
    }
  }, [user]);

  const loadMoreMessages = useCallback(() => {
    if (!activeConversation || loadingMore || !hasMoreMessages) return;
    setLoadingMore(true);
    fetchMessages(activeConversation, true).finally(() => setLoadingMore(false));
  }, [activeConversation, loadingMore, hasMoreMessages, fetchMessages]);

  // Global listener
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
          if (!convIdsRef.current.includes(newMsg.conversation_id)) return;

          if (newMsg.conversation_id === activeConversation) {
            setMessages(prev => [...prev, newMsg]);
            supabase.from('messages').update({
              is_read: true,
              delivered_at: new Date().toISOString(),
              read_at: new Date().toISOString(),
            }).eq('id', newMsg.id).then().catch(() => {});
          } else {
            // Mark as delivered (but not read)
            supabase.from('messages').update({
              delivered_at: new Date().toISOString(),
            }).eq('id', newMsg.id).then().catch(() => {});
          }

          fetchConversations();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(globalChannel); };
  }, [user, activeConversation, fetchConversations]);

  // Per-conversation UPDATE listener
  useEffect(() => {
    if (!activeConversation) return;

    channelRef.current = supabase
      .channel(`messages-updates-${activeConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversation}`,
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m));
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [activeConversation]);

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
  };
}

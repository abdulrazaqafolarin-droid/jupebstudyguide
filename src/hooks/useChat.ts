import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  message_type?: 'text' | 'image' | 'file';
  reply_to_id?: string | null;
  is_edited?: boolean;
  reactions?: Record<string, string[]>;
  image_url?: string | null;
  group_name?: string;
}

export function useChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
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

      // Batch: fetch all participants for all conversations at once
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

      // Collect all unique user IDs
      const allUserIds = new Set<string>();
      for (const userIds of participantsByConv.values()) {
        for (const uid of userIds) allUserIds.add(uid);
      }

      // Batch: fetch all profiles at once
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', [...allUserIds]);

      const profileMap = new Map<string, Profile>();
      for (const p of (allProfiles ?? []) as Profile[]) {
        profileMap.set(p.user_id, p);
      }

      // Batch: fetch all last messages
      // PostgreSQL: DISTINCT ON with conversation_id to get latest message per conv
      const { data: allLastMsgs } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false });
      // Group by conversation, take first (latest)
      const lastMsgByConv = new Map<string, Message>();
      for (const msg of (allLastMsgs ?? []) as Message[]) {
        if (!lastMsgByConv.has(msg.conversation_id)) {
          lastMsgByConv.set(msg.conversation_id, msg);
        }
      }

      // Batch: fetch all unread counts
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

      // Batch: fetch group names (first message with group_name per conversation)
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

      setConversations(enriched);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
    setLoading(false);
  }, [user]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    setMessages(data || []);
    setMessagesLoading(false);

    if (user) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false);
    }
  }, [user]);

  useEffect(() => {
    if (!activeConversation) return;

    channelRef.current = supabase
      .channel(`messages-${activeConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversation}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);

          if (user && newMsg.sender_id !== user.id) {
            supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).then().catch(() => {});
          }

          fetchConversations();
        }
      )
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
  }, [activeConversation, user, fetchConversations]);

  const openConversation = useCallback(async (conversationId: string) => {
    setActiveConversation(conversationId);
    await fetchMessages(conversationId);
  }, [fetchMessages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !activeConversation || !content.trim()) return;

    const optimisticMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: activeConversation,
      sender_id: user.id,
      content: content.trim(),
      created_at: new Date().toISOString(),
      is_read: false,
      message_type: 'text',
    };

    setMessages(prev => [...prev, optimisticMsg]);

    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConversation,
      sender_id: user.id,
      content: content.trim(),
      message_type: 'text',
    });

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      console.error('Error sending message:', error);
      return;
    }

    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversation).catch(() => {});
  }, [user, activeConversation]);

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
      message_type: 'image',
      image_url: imageUrl,
    });

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      return;
    }

    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversation).catch(() => {});
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
    if (!user) return null;

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

    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();

    if (convError || !conv) return null;

    const { error: partError } = await supabase.from('conversation_participants').insert(
      { conversation_id: conv.id, user_id: user.id }
    );
    if (partError) return null;

    const { error: otherError } = await supabase.from('conversation_participants').insert(
      { conversation_id: conv.id, user_id: otherUserId }
    );
    if (otherError) return null;

    await fetchConversations();
    await openConversation(conv.id);
    return conv.id;
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
    openConversation,
    sendMessage,
    sendImage,
    sendReaction,
    startConversation,
    searchUsers,
    uploadImage,
    setActiveConversation,
    fetchConversations,
  };
}

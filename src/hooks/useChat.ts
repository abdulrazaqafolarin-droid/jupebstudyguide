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

      const enriched: Conversation[] = await Promise.all(
        convData.map(async (conv) => {
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.id);

          const isGroup = (participants?.length || 0) > 2;
          let otherUser: Profile | null = null;
          let groupName: string | undefined;

          if (isGroup) {
            const otherParticipants = participants?.filter(p => p.user_id !== user.id) || [];
            const participantIds = otherParticipants.map(p => p.user_id);
            if (participantIds.length > 0) {
              const { data: profiles } = await supabase
                .from('profiles')
                .select('*')
                .in('user_id', participantIds);
              const participantProfiles = (profiles || []) as Profile[];
              otherUser = participantProfiles[0] || null;
            }

            const { data: firstMsg } = await supabase
              .from('messages')
              .select('group_name')
              .eq('conversation_id', conv.id)
              .not('group_name', 'is', null)
              .order('created_at', { ascending: true })
              .limit(1)
              .single();
            groupName = firstMsg?.group_name || undefined;
          } else {
            const otherParticipant = participants?.find(p => p.user_id !== user.id);
            if (otherParticipant) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', otherParticipant.user_id)
                .single();
              otherUser = profile;
            }
          }

          const { data: lastMsg } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          return {
            ...conv,
            other_user: otherUser,
            last_message: lastMsg,
            unread_count: count || 0,
            is_group: isGroup,
            group_name: groupName,
          };
        })
      );

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
            supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).then();
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
    }

    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversation);
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
    }

    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConversation);
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

    await supabase.from('messages').update({ reactions: updated }).eq('id', messageId);
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

    await supabase.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: otherUserId },
    ]);

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

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { QuestionRef } from '@/lib/ai-service';

export interface AIMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  attachment?: { base64?: string; mimeType: string; name: string } | null;
  /** Past-bank questions retrieved for this reply (RAG citations, not persisted). */
  questionRefs?: QuestionRef[];
}

export interface AIChat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

/**
 * Database-backed AI tutor chats, scoped per authenticated user via RLS.
 * History persists across logout/login and devices.
 */
export function useAITutorChats() {
  const { user, loading: authLoading } = useAuth();
  const [chats, setChats] = useState<AIChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesRef = useRef<AIMessage[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Load chat list
  const loadChats = useCallback(async () => {
    if (!user) { setChats([]); return []; }
    const { data } = await supabase
      .from('ai_chats')
      .select('id,title,created_at,updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    setChats(data || []);
    return data || [];
  }, [user]);

  // Load messages for a chat
  const loadMessages = useCallback(async (chatId: string) => {
    const { data } = await supabase
      .from('ai_chat_messages')
      .select('id,role,content,attachment')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    const msgs: AIMessage[] = (data || []).map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      attachment: m.attachment as AIMessage['attachment'],
    }));
    setMessages(msgs);
  }, []);

  // Init: load chats and ensure one is active
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setChats([]); setActiveChatId(null); setMessages([]);
      return;
    }
    (async () => {
      setIsLoading(true);
      const list = await loadChats();
      if (list && list.length > 0) {
        setActiveChatId(list[0].id);
        await loadMessages(list[0].id);
      } else {
        // create first chat
        const { data: created } = await supabase
          .from('ai_chats')
          .insert({ user_id: user.id, title: 'New Chat' })
          .select('id,title,created_at,updated_at')
          .single();
        if (created) {
          setChats([created]);
          setActiveChatId(created.id);
          setMessages([]);
        }
      }
      setIsLoading(false);
    })();
  }, [user, authLoading, loadChats, loadMessages]);

  const switchChat = useCallback(async (chatId: string) => {
    setActiveChatId(chatId);
    await loadMessages(chatId);
  }, [loadMessages]);

  const newChat = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase
      .from('ai_chats')
      .insert({ user_id: user.id, title: 'New Chat' })
      .select('id,title,created_at,updated_at')
      .single();
    if (data) {
      setChats(prev => [data, ...prev]);
      setActiveChatId(data.id);
      setMessages([]);
      return data.id;
    }
    return null;
  }, [user]);

  const deleteChat = useCallback(async (chatId: string) => {
    if (!user) return;
    await supabase.from('ai_chats').delete().eq('id', chatId);
    const remaining = chats.filter(c => c.id !== chatId);
    if (remaining.length === 0) {
      const { data } = await supabase
        .from('ai_chats')
        .insert({ user_id: user.id, title: 'New Chat' })
        .select('id,title,created_at,updated_at')
        .single();
      if (data) {
        setChats([data]); setActiveChatId(data.id); setMessages([]);
      }
    } else {
      setChats(remaining);
      if (activeChatId === chatId) {
        setActiveChatId(remaining[0].id);
        await loadMessages(remaining[0].id);
      }
    }
  }, [user, chats, activeChatId, loadMessages]);

  // Persist a user message immediately, return the inserted row id
  const saveUserMessage = useCallback(async (chatId: string, msg: AIMessage) => {
    if (!user) return null;
    // Don't store base64 payloads (storage waste); keep attachment metadata only.
    const attachmentMeta = msg.attachment
      ? { name: msg.attachment.name, mimeType: msg.attachment.mimeType }
      : null;
    const { data } = await supabase
      .from('ai_chat_messages')
      .insert({ chat_id: chatId, user_id: user.id, role: 'user', content: msg.content, attachment: attachmentMeta })
      .select('id').single();

    // Auto-title after first user message
    const userCount = messagesRef.current.filter(m => m.role === 'user').length + 1;
    const chat = chats.find(c => c.id === chatId);
    if (chat && chat.title === 'New Chat' && userCount >= 1) {
      const words = msg.content.split(/\s+/).filter(Boolean);
      const title = (words.slice(0, 6).join(' ') || 'New Chat').slice(0, 60);
      await supabase.from('ai_chats').update({ title, updated_at: new Date().toISOString() }).eq('id', chatId);
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, title } : c));
    } else {
      await supabase.from('ai_chats').update({ updated_at: new Date().toISOString() }).eq('id', chatId);
    }
    return data?.id || null;
  }, [user, chats]);

  // Persist assistant message after stream completes
  const saveAssistantMessage = useCallback(async (chatId: string, content: string) => {
    if (!user || !content.trim()) return;
    await supabase
      .from('ai_chat_messages')
      .insert({ chat_id: chatId, user_id: user.id, role: 'assistant', content });
    await supabase.from('ai_chats').update({ updated_at: new Date().toISOString() }).eq('id', chatId);
  }, [user]);

  return {
    chats,
    activeChatId,
    messages,
    setMessages,
    isLoading,
    switchChat,
    newChat,
    deleteChat,
    saveUserMessage,
    saveAssistantMessage,
    refreshChats: loadChats,
  };
}

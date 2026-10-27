import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { streamChat } from '@/lib/ai-service';
import { TUTOR_SYSTEM_PROMPT, GENERAL_CHAT_PROMPT } from '@/lib/prompts';
import { getSyllabusContext, buildTopicSystemPrompt } from '@/lib/syllabus-context';
import { searchRelevantChunks } from '@/lib/rag';
import type { AIMessage } from '@/hooks/useAITutorChats';
import type { SyllabusTopic } from '@/types/syllabus';
import type { Subject } from '@/types/question';
import {
  CHAT_SELECT_COLS,
  type StudyChatMeta,
  findSyllabusTopic,
  resolveEditBoundary,
  topicChatTitle,
  trimMessagesForContext,
} from '@/lib/study-chat';

export interface ActiveStudyTopic {
  topic: SyllabusTopic;
  subject: Subject;
  subtopic: string | null;
}

/**
 * Study Chat state: topic-scoped AI threads over the same `ai_chats` /
 * `ai_chat_messages` tables the floating tutor uses (merged history), with
 * streaming, stop, edit-rewind, find-or-create per syllabus topic, and an
 * inline retry card when a stream dies before its first token.
 */
export function useStudyChat() {
  const { user, loading: authLoading } = useAuth();
  const [chats, setChats] = useState<StudyChatMeta[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<ActiveStudyTopic | null>(null);

  const messagesRef = useRef<AIMessage[]>([]);
  const chatsRef = useRef<StudyChatMeta[]>([]);
  const activeChatIdRef = useRef<string | null>(null);
  const activeTopicRef = useRef<ActiveStudyTopic | null>(null);
  const isStreamingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const assistantContentRef = useRef('');

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { chatsRef.current = chats; }, [chats]);
  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);
  useEffect(() => { activeTopicRef.current = activeTopic; }, [activeTopic]);
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);

  const loadChats = useCallback(async (): Promise<StudyChatMeta[]> => {
    if (!user) { setChats([]); return []; }
    const { data } = await supabase
      .from('ai_chats')
      .select(CHAT_SELECT_COLS)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    const rows = (data ?? []) as unknown as StudyChatMeta[];
    setChats(rows);
    return rows;
  }, [user]);

  const loadMessages = useCallback(async (chatId: string) => {
    const { data } = await supabase
      .from('ai_chat_messages')
      .select('id,role,content,attachment,created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    const msgs: AIMessage[] = ((data ?? []) as Array<{
      id: string; role: string; content: string;
      attachment: AIMessage['attachment']; created_at: string;
    }>).map((m) => ({
      id: m.id,
      created_at: m.created_at,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      attachment: m.attachment,
    }));
    setMessages(msgs);
  }, []);

  /** Point the UI at a row (selection without a lookup). */
  const adoptChat = useCallback(async (row: StudyChatMeta | null) => {
    setActiveChatId(row?.id ?? null);
    setStreamError(null);
    if (!row) {
      setMessages([]);
      setActiveTopic(null);
      return;
    }
    if (row.topic_id) {
      const found = findSyllabusTopic(row.topic_id);
      setActiveTopic(found ? { topic: found.topic, subject: found.subject, subtopic: row.subtopic } : null);
    } else {
      setActiveTopic(null);
    }
    await loadMessages(row.id);
  }, [loadMessages]);

  const createTopicChat = useCallback(async (
    topic: SyllabusTopic,
    subject: Subject,
    subtopic?: string | null,
  ): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('ai_chats')
      .insert({
        user_id: user.id,
        title: topicChatTitle(topic.name),
        topic_id: topic.id,
        subtopic: subtopic ?? null,
        subject,
      })
      .select(CHAT_SELECT_COLS)
      .single();
    if (error || !data) {
      console.error('Could not create topic chat:', error);
      toast.error('Could not start a study room. Please try again.');
      return null;
    }
    const row = data as unknown as StudyChatMeta;
    setChats((prev) => [row, ...prev.filter((c) => c.id !== row.id)]);
    setActiveChatId(row.id);
    setMessages([]);
    setStreamError(null);
    setActiveTopic({ topic, subject, subtopic: subtopic ?? null });
    return row.id;
  }, [user]);

  /** Syllabus entry point: resume the topic's newest thread, else create one. */
  const openTopic = useCallback(async (
    topic: SyllabusTopic,
    subject: Subject,
    subtopic?: string | null,
  ): Promise<string | null> => {
    if (!user) return null;
    const { data } = await supabase
      .from('ai_chats')
      .select(CHAT_SELECT_COLS)
      .eq('user_id', user.id)
      .eq('topic_id', topic.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      const row = data as unknown as StudyChatMeta;
      setChats((prev) => (prev.some((c) => c.id === row.id) ? prev : [row, ...prev]));
      await adoptChat(row);
      // Resume keeps the original subtopic focus; refresh it when this click
      // named one and the thread never had one.
      if (!row.subtopic && subtopic) {
        supabase.from('ai_chats').update({ subtopic }).eq('id', row.id).then(() => undefined);
        setActiveTopic((prev) => (prev ? { ...prev, subtopic } : prev));
        setChats((prev) => prev.map((c) => (c.id === row.id ? { ...c, subtopic } : c)));
      }
      return row.id;
    }
    return createTopicChat(topic, subject, subtopic);
  }, [user, adoptChat, createTopicChat]);

  const switchChat = useCallback(async (chatId: string) => {
    const row = chatsRef.current.find((c) => c.id === chatId) ?? null;
    if (!row) return;
    await adoptChat(row);
  }, [adoptChat]);

  /** Sidebar "+ New chat": a topic-less thread (generic tutor prompt). */
  const newChat = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('ai_chats')
      .insert({ user_id: user.id, title: 'New Chat' })
      .select(CHAT_SELECT_COLS)
      .single();
    if (error || !data) {
      toast.error('Could not create a new chat. Please try again.');
      return null;
    }
    const row = data as unknown as StudyChatMeta;
    setChats((prev) => [row, ...prev]);
    await adoptChat(row);
    return row.id;
  }, [user, adoptChat]);

  const deleteChat = useCallback(async (chatId: string) => {
    if (!user) return;
    await supabase.from('ai_chats').delete().eq('id', chatId);
    const remaining = chatsRef.current.filter((c) => c.id !== chatId);
    setChats(remaining);
    if (activeChatIdRef.current === chatId) {
      await adoptChat(remaining[0] ?? null);
    }
  }, [user, adoptChat]);

  const renameChat = useCallback(async (chatId: string, title: string) => {
    const clean = title.trim().slice(0, 60) || 'New Chat';
    const { error } = await supabase.from('ai_chats').update({ title }).eq('id', chatId);
    if (error) {
      toast.error('Could not rename the chat.');
      return;
    }
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title: clean } : c)));
  }, []);

  /** Rewind stored history from an edit point (same contract as the floating tutor). */
  const deleteMessagesFrom = useCallback(async (
    chatId: string,
    fromCreatedAt: string | null,
    inclusive = true,
  ) => {
    if (!user) return;
    let q = supabase.from('ai_chat_messages').delete().eq('chat_id', chatId);
    if (fromCreatedAt) {
      q = inclusive ? q.gte('created_at', fromCreatedAt) : q.gt('created_at', fromCreatedAt);
    }
    const { error } = await q;
    if (error) throw error;
  }, [user]);

  /** One model turn: optimistic user bubble → persist → stream → persist. */
  const runTurn = useCallback(async (
    base: AIMessage[],
    userText: string,
    opts: { persistUser?: boolean } = {},
  ) => {
    const chatId = activeChatIdRef.current;
    if (!chatId || !user || !userText.trim() || isStreamingRef.current) return;
    const userId = user.id; // captured: auth may change while the stream runs
    const persistUser = opts.persistUser !== false;

    const userMsg: AIMessage = { role: 'user', content: userText };
    const newMsgs = [...base, userMsg];
    setMessages(newMsgs);
    setIsStreaming(true);
    isStreamingRef.current = true;
    setStreamError(null);
    assistantContentRef.current = '';

    if (persistUser) {
      const savedUserIdx = newMsgs.length - 1;
      void (async () => {
        try {
          const { data: saved } = await supabase
            .from('ai_chat_messages')
            .insert({ chat_id: chatId, user_id: userId, role: 'user', content: userText, attachment: null })
            .select('id,created_at')
            .single();
          if (!saved || activeChatIdRef.current !== chatId) return;
          // Stamp the local bubble so a later edit can cut at this message.
          setMessages((prev) => {
            const m = prev[savedUserIdx];
            if (m && m.role === 'user' && !m.created_at && m.content === userText) {
              const next = [...prev];
              next[savedUserIdx] = { ...m, id: saved.id, created_at: saved.created_at };
              return next;
            }
            return prev;
          });
        } catch (e) {
          console.error('Could not persist user message:', e);
        }
      })();

      // Auto-title only generic chats (topic threads are titled at creation).
      const chat = chatsRef.current.find((c) => c.id === chatId);
      void (async () => {
        try {
          if (chat && chat.title === 'New Chat') {
            const title = (userText.split(/\s+/).filter(Boolean).slice(0, 6).join(' ') || 'New Chat').slice(0, 60);
            const { error } = await supabase
              .from('ai_chats')
              .update({ title, updated_at: new Date().toISOString() })
              .eq('id', chatId);
            if (!error) setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title } : c)));
          } else {
            await supabase.from('ai_chats').update({ updated_at: new Date().toISOString() }).eq('id', chatId);
          }
        } catch {
          /* best-effort bookkeeping — next message retries the bump */
        }
      })();
    }

    let ragContext = '';
    try {
      ragContext = await searchRelevantChunks(userText);
    } catch (e) {
      console.warn('RAG search failed:', e);
    }

    const topic = activeTopicRef.current;
    const systemPrompt = topic
      ? buildTopicSystemPrompt(topic.topic, topic.subject, topic.subtopic)
      : TUTOR_SYSTEM_PROMPT + '\n\n' + GENERAL_CHAT_PROMPT + getSyllabusContext();
    const subject = topic?.subject
      ?? (chatsRef.current.find((c) => c.id === chatId)?.subject ?? undefined);

    let acc = '';
    let firstToken = true;

    const ac = new AbortController();
    abortRef.current = ac;

    await streamChat(
      systemPrompt,
      trimMessagesForContext(newMsgs).map((m) => ({ role: m.role, content: m.content })),
      {
        onDelta: (text) => {
          if (firstToken) {
            firstToken = false;
            setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
          }
          acc += text;
          assistantContentRef.current = acc;
          setMessages((prev) => {
            const arr = [...prev];
            if (arr.length && arr[arr.length - 1].role === 'assistant') {
              arr[arr.length - 1] = {
                role: 'assistant',
                content: acc,
                questionRefs: arr[arr.length - 1].questionRefs,
              };
            }
            return arr;
          });
        },
        onQuestionReferences: (refs) => {
          setMessages((prev) => {
            const arr = [...prev];
            if (arr.length && arr[arr.length - 1].role === 'assistant') {
              arr[arr.length - 1] = { ...arr[arr.length - 1], questionRefs: refs };
            }
            return arr;
          });
        },
        onDone: async () => {
          if (abortRef.current === ac) abortRef.current = null;
          if (!firstToken && assistantContentRef.current) {
            try {
              const savedContent = assistantContentRef.current;
              const { data: saved } = await supabase
                .from('ai_chat_messages')
                .insert({ chat_id: chatId, user_id: userId, role: 'assistant', content: savedContent })
                .select('id,created_at')
                .single();
              if (saved?.created_at && activeChatIdRef.current === chatId) {
                setMessages((prev) => {
                  for (let i = prev.length - 1; i >= 0; i--) {
                    const m = prev[i];
                    if (m.role === 'assistant' && !m.created_at && m.content === savedContent) {
                      const next = [...prev];
                      next[i] = { ...m, id: saved.id as string, created_at: saved.created_at as string };
                      return next;
                    }
                  }
                  return prev;
                });
              }
            } catch {
              console.warn('Assistant message save failed (chat may have been deleted mid-stream)');
            }
          }
          setIsStreaming(false);
          isStreamingRef.current = false;
        },
        onError: (err) => {
          if (abortRef.current === ac) abortRef.current = null;
          toast.error(err);
          if (firstToken) {
            // Nothing streamed — drop any empty placeholder and offer Retry.
            setMessages((prev) => (
              prev.length && prev[prev.length - 1].role === 'assistant' && !prev[prev.length - 1].content
                ? prev.slice(0, -1)
                : prev
            ));
            setStreamError(err);
          }
          setIsStreaming(false);
          isStreamingRef.current = false;
        },
      },
      ragContext,
      subject,
      ac.signal,
    );
  }, [user]);

  const sendMessage = useCallback(async (text: string) => {
    await runTurn(messagesRef.current, text);
  }, [runTurn]);

  /** Edit: rewind the thread to the edited message, then re-run the turn. */
  const sendEdited = useCallback(async (text: string, editIndex: number) => {
    const chatId = activeChatIdRef.current;
    if (!chatId || editIndex < 0 || editIndex >= messagesRef.current.length) return;
    const boundary = resolveEditBoundary(messagesRef.current, editIndex);
    try {
      await deleteMessagesFrom(chatId, boundary.ts, boundary.include);
    } catch (e) {
      console.warn('Could not prune edited messages from DB:', e);
    }
    await runTurn(messagesRef.current.slice(0, editIndex), text);
  }, [deleteMessagesFrom, runTurn]);

  /** Retry after a pre-token stream failure: the user row is already
   *  persisted, so re-run the turn without inserting it again. */
  const retry = useCallback(async () => {
    const list = messagesRef.current;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].role === 'user') {
        await runTurn(list.slice(0, i), list[i].content, { persistUser: false });
        return;
      }
    }
  }, [runTurn]);

  /** ChatGPT-style stop: abort, keep whatever streamed (onDone persists it). */
  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages((prev) => (
      prev.length && prev[prev.length - 1].role === 'assistant' && !prev[prev.length - 1].content
        ? prev.slice(0, -1)
        : prev
    ));
    setIsStreaming(false);
    isStreamingRef.current = false;
  }, []);

  // Load the merged history once auth settles.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setChats([]);
      setActiveChatId(null);
      setMessages([]);
      setListLoading(false);
      return;
    }
    let cancelled = false;
    setListLoading(true);
    loadChats()
      .catch((e) => console.error('Could not load study chats:', e))
      .finally(() => { if (!cancelled) setListLoading(false); });
    return () => { cancelled = true; };
  }, [user, authLoading, loadChats]);

  // Abort any in-flight stream when the page unmounts.
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  return {
    chats,
    activeChatId,
    messages,
    isStreaming,
    listLoading,
    streamError,
    activeTopic,
    openTopic,
    switchChat,
    newChat,
    deleteChat,
    renameChat,
    sendMessage,
    sendEdited,
    retry,
    stop,
  };
}

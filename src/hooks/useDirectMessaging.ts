import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { type RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  ensureIdentityKey,
  importConversationKey,
  encryptMessage,
  decryptMessage,
  encryptKeyForRecipient,
  decryptKeyForMe,
  generateConversationKey,
  generateClientMsgId,
} from '@/lib/dm-encryption';
import {
  queueOutboundMessage,
  updateOutboundState,
  removeOutboundMessage,
  getAllPendingMessages,
  getConversationKey,
  storeConversationKey,
  incrementRetry,
  type OutboundMessage,
  type MessageState,
} from '@/lib/dm-store';

export interface DmMessage {
  id: number;
  clientMsgId: string;
  conversationId: string;
  senderId: string;
  type: string;
  ciphertext: string;
  iv: string;
  plaintext?: string;
  mediaUrl?: string | null;
  mediaMeta?: Record<string, unknown> | null;
  replyToId?: number | null;
  forwardedHops: number;
  viewOnce: boolean;
  expiresAt?: string | null;
  editedAt?: string | null;
  isDeleted: boolean;
  state: MessageState;
  sentAt: string;
  reactions?: DmReaction[];
}

export interface DmReaction {
  id: number;
  messageId: number;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface DmConversation {
  id: string;
  participantA: string;
  participantB: string;
  otherUser: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
    publicKey: string | null;
  };
  disappearTimer: string | null;
  lastMessage?: { text: string; sentAt: string } | null;
  unreadCount: number;
  updatedAt: string;
}

const MAX_RETRIES = 5;
const RETRY_BASE_DELAY = 1000;

export function useDirectMessaging() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [convKey, setConvKey] = useState<CryptoKey | null>(null);
  const [identityKey, setIdentityKey] = useState<{ publicKey: string; privateKey: CryptoKey } | null>(null);
  const activeConvIdRef = useRef(activeConvId);
  activeConvIdRef.current = activeConvId;

  useEffect(() => {
    if (!user) return;
    ensureIdentityKey().then(setIdentityKey).catch(console.error);
  }, [user]);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const { data: convs } = await supabase
      .from('direct_conversations')
      .select('*')
      .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    if (!convs) return;

    const otherIds = convs.map(c => c.participant_a === user.id ? c.participant_b : c.participant_a);
    const { data: profs } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, public_key')
      .in('user_id', otherIds);

    const profileMap = new Map((profs || []).map(p => [p.user_id, p]));

    const enriched: DmConversation[] = await Promise.all(
      convs.map(async (c) => {
        const otherId = c.participant_a === user.id ? c.participant_b : c.participant_a;
        const prof = profileMap.get(otherId);
        const { count } = await supabase
          .rpc('get_unread_count', { p_conversation_id: c.id, p_user_id: user.id });
        const { data: lastMsg } = await supabase
          .from('direct_messages')
          .select('ciphertext, sent_at, type')
          .eq('conversation_id', c.id)
          .eq('is_deleted', false)
          .order('sent_at', { ascending: false })
          .limit(1);

        let lastText = '';
        if (lastMsg && lastMsg.length > 0) {
          lastText = lastMsg[0].type === 'text' ? 'Encrypted message' : lastMsg[0].type;
        }

        return {
          id: c.id,
          participantA: c.participant_a,
          participantB: c.participant_b,
          otherUser: {
            id: otherId,
            displayName: prof?.display_name ?? null,
            avatarUrl: prof?.avatar_url ?? null,
            publicKey: prof?.public_key ?? null,
          },
          disappearTimer: c.disappear_timer,
          lastMessage: lastMsg ? { text: lastText, sentAt: lastMsg[0].sent_at } : null,
          unreadCount: count ?? 0,
          updatedAt: c.updated_at,
        };
      }),
    );

    setConversations(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const loadConversationKey = useCallback(async (convId: string) => {
    if (!identityKey || !user) return;
    const cached = await getConversationKey(convId);
    if (cached) {
      try {
        const key = await importConversationKey(cached);
        setConvKey(key);
        return;
      } catch { }
    }

    const { data: keyRow } = await supabase
      .from('chat_keys')
      .select('encrypted_key')
      .eq('conversation_id', convId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (keyRow?.encrypted_key) {
      const conv = conversations.find(c => c.id === convId);
      if (conv?.otherUser.publicKey) {
        const keyBase64 = await decryptKeyForMe(
          keyRow.encrypted_key,
          identityKey.privateKey,
          conv.otherUser.publicKey,
        );
        const key = await importConversationKey(keyBase64);
        await storeConversationKey(convId, keyBase64);
        setConvKey(key);
        return;
      }
    }
    setConvKey(null);
  }, [identityKey, user, conversations]);

  const openConversation = useCallback(async (convId: string) => {
    setActiveConvId(convId);
    setMessages([]);
    setSending(true);

    await loadConversationKey(convId);

    const { data: msgs } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('conversation_id', convId)
      .eq('is_deleted', false)
      .order('sent_at', { ascending: true })
      .limit(50);

    if (!msgs) { setSending(false); return; }

    const decrypted = await Promise.all(
      msgs.map(async (m) => {
        let plaintext = m.type === 'system' ? '[system]' : undefined;
        if (convKey && m.ciphertext && m.type !== 'system') {
          try {
            plaintext = await decryptMessage(m.ciphertext, '', convKey);
          } catch { plaintext = '[decryption failed]'; }
        }
        return {
          id: m.id,
          clientMsgId: m.client_msg_id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          type: m.type,
          ciphertext: m.ciphertext,
          iv: '',
          plaintext,
          mediaUrl: m.media_url,
          mediaMeta: m.media_meta as Record<string, unknown> | null,
          replyToId: m.reply_to_id,
          forwardedHops: m.forwarded_hops,
          viewOnce: m.view_once,
          expiresAt: m.expires_at,
          editedAt: m.edited_at,
          isDeleted: m.is_deleted,
          state: m.state as MessageState,
          sentAt: m.sent_at,
        } as DmMessage;
      }),
    );

    setMessages(decrypted);

    await supabase
      .from('direct_messages')
      .update({ state: 'read' })
      .eq('conversation_id', convId)
      .neq('sender_id', user?.id)
      .neq('state', 'read');

    setSending(false);
  }, [convKey, user, loadConversationKey]);

  const sendMessage = useCallback(async (
    conversationId: string,
    type: string,
    plaintext: string,
    opts?: {
      mediaUrl?: string;
      mediaMeta?: Record<string, unknown>;
      replyToId?: number | null;
      viewOnce?: boolean;
      forwardedHops?: number;
    },
  ) => {
    if (!user || !convKey) return;

    const clientMsgId = generateClientMsgId();
    const { ciphertext, iv } = await encryptMessage(plaintext, convKey);

    const optimistic: DmMessage = {
      id: -Date.now(),
      clientMsgId,
      conversationId,
      senderId: user.id,
      type,
      ciphertext,
      iv,
      plaintext,
      mediaUrl: opts?.mediaUrl,
      mediaMeta: opts?.mediaMeta ?? null,
      replyToId: opts?.replyToId ?? null,
      forwardedHops: opts?.forwardedHops ?? 0,
      viewOnce: opts?.viewOnce ?? false,
      isDeleted: false,
      state: 'sending',
      sentAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimistic]);

    await queueOutboundMessage({
      clientMsgId,
      conversationId,
      type,
      ciphertext,
      iv,
      mediaUrl: opts?.mediaUrl,
      mediaMeta: opts?.mediaMeta as Record<string, unknown> | undefined,
      replyToId: opts?.replyToId ?? null,
      viewOnce: opts?.viewOnce ?? false,
      forwardedHops: opts?.forwardedHops ?? 0,
      state: 'sending',
      createdAt: optimistic.sentAt,
      retryCount: 0,
    });

    const { error } = await supabase
      .from('direct_messages')
      .insert({
        client_msg_id: clientMsgId,
        conversation_id: conversationId,
        sender_id: user.id,
        type,
        ciphertext,
        media_url: opts?.mediaUrl ?? null,
        media_meta: opts?.mediaMeta ?? null,
        reply_to_id: opts?.replyToId ?? null,
        forwarded_hops: opts?.forwardedHops ?? 0,
        view_once: opts?.viewOnce ?? false,
        state: 'sent',
      });

    if (error) {
      setMessages(prev => prev.map(m =>
        m.clientMsgId === clientMsgId ? { ...m, state: 'pending' as MessageState } : m,
      ));
      await updateOutboundState(clientMsgId, 'pending');
    } else {
      setMessages(prev => prev.map(m =>
        m.clientMsgId === clientMsgId ? { ...m, id: Date.now(), state: 'sent' as MessageState } : m,
      ));
      await removeOutboundMessage(clientMsgId);
    }
  }, [user, convKey]);

  const retryMessage = useCallback(async (clientMsgId: string) => {
    const msg = messages.find(m => m.clientMsgId === clientMsgId);
    if (!msg || !convKey) return;

    setMessages(prev => prev.map(m =>
      m.clientMsgId === clientMsgId ? { ...m, state: 'sending' as MessageState } : m,
    ));
    await updateOutboundState(clientMsgId, 'sending');

    const { error } = await supabase
      .from('direct_messages')
      .insert({
        client_msg_id: clientMsgId,
        conversation_id: msg.conversationId,
        sender_id: msg.senderId,
        type: msg.type,
        ciphertext: msg.ciphertext,
        media_url: msg.mediaUrl,
        media_meta: msg.mediaMeta,
        reply_to_id: msg.replyToId,
        forwarded_hops: msg.forwardedHops,
        view_once: msg.viewOnce,
        state: 'sent',
      });

    if (error) {
      await incrementRetry(clientMsgId);
      setMessages(prev => prev.map(m =>
        m.clientMsgId === clientMsgId ? { ...m, state: 'pending' as MessageState } : m,
      ));
    } else {
      setMessages(prev => prev.map(m =>
        m.clientMsgId === clientMsgId ? { ...m, state: 'sent' as MessageState } : m,
      ));
      await removeOutboundMessage(clientMsgId);
    }
  }, [messages, convKey]);

  const editMessage = useCallback(async (messageId: number, newPlaintext: string) => {
    if (!user || !convKey || !activeConvId) return;

    const original = messages.find(m => m.id === messageId);
    if (!original) return;
    if (Date.now() - new Date(original.sentAt).getTime() > 15 * 60 * 1000) return;

    const { ciphertext } = await encryptMessage(newPlaintext, convKey);

    const { error } = await supabase
      .from('direct_messages')
      .update({ ciphertext, edited_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', user.id);

    if (error) return;

    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, ciphertext, plaintext: newPlaintext, editedAt: new Date().toISOString() } : m,
    ));
  }, [user, convKey, activeConvId, messages]);

  const deleteMessage = useCallback(async (messageId: number) => {
    if (!user) return;
    await supabase
      .from('direct_messages')
      .update({ is_deleted: true })
      .eq('id', messageId)
      .eq('sender_id', user.id);
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, isDeleted: true } : m,
    ));
  }, [user]);

  const upsertReaction = useCallback(async (messageId: number, emoji: string) => {
    if (!user) return;
    await supabase
      .from('direct_reactions')
      .upsert(
        { message_id: messageId, user_id: user.id, emoji },
        { onConflict: 'message_id, user_id' },
      );
  }, [user]);

  const removeReaction = useCallback(async (messageId: number) => {
    if (!user) return;
    await supabase
      .from('direct_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id);
  }, [user]);

  const starMessage = useCallback(async (messageId: number) => {
    if (!user) return;
    await supabase
      .from('starred_messages')
      .upsert({ user_id: user.id, message_id: messageId }, { onConflict: 'user_id, message_id' });
  }, [user]);

  const unstarMessage = useCallback(async (messageId: number) => {
    if (!user) return;
    await supabase
      .from('starred_messages')
      .delete()
      .eq('user_id', user.id)
      .eq('message_id', messageId);
  }, [user]);

  const getOrCreateConversation = useCallback(async (otherUserId: string): Promise<string | null> => {
    if (!user) return null;
    const { data } = await supabase
      .rpc('get_or_create_direct_conversation', { p_user_a: user.id, p_user_b: otherUserId });
    if (data) {
      await fetchConversations();
      return data as string;
    }
    return null;
  }, [user, fetchConversations]);

  const initConversationKey = useCallback(async (convId: string, otherUserPublicKey: string) => {
    if (!identityKey || !user) return;
    const { key, keyBase64 } = await generateConversationKey(identityKey.privateKey, otherUserPublicKey);
    const encryptedForMe = await encryptKeyForRecipient(
      keyBase64,
      otherUserPublicKey,
      identityKey.privateKey,
    );
    await supabase.from('chat_keys').upsert(
      {
        conversation_id: convId,
        user_id: user.id,
        encrypted_key: encryptedForMe,
      },
      { onConflict: 'conversation_id, user_id' },
    );
    await storeConversationKey(convId, keyBase64);
    setConvKey(key);
  }, [identityKey, user]);

  const flushPendingMessages = useCallback(async () => {
    if (!convKey) return;
    const pending = await getAllPendingMessages();
    for (const msg of pending) {
      if (msg.retryCount >= MAX_RETRIES) continue;
      await updateOutboundState(msg.clientMsgId, 'sending');
      const { error } = await supabase.from('direct_messages').insert({
        client_msg_id: msg.clientMsgId,
        conversation_id: msg.conversationId,
        sender_id: user?.id,
        type: msg.type,
        ciphertext: msg.ciphertext,
        state: 'sent',
      });
      if (error) {
        await incrementRetry(msg.clientMsgId);
        await updateOutboundState(msg.clientMsgId, 'pending');
      } else {
        await removeOutboundMessage(msg.clientMsgId);
      }
    }
  }, [convKey, user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('direct-messages-live')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        async (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const msg = payload.new as Record<string, unknown>;
          if (!msg || msg.sender_id === user.id) return;
          if (msg.conversation_id !== activeConvIdRef.current && activeConvIdRef.current) return;

          if (msg.conversation_id === activeConvIdRef.current) {
            let plaintext = '[encrypted]';
            if (convKey && msg.ciphertext && msg.type !== 'system') {
              try { plaintext = await decryptMessage(msg.ciphertext as string, '', convKey); }
              catch { plaintext = '[decryption failed]'; }
            }
            const dm: DmMessage = {
              id: msg.id as number,
              clientMsgId: msg.client_msg_id as string,
              conversationId: msg.conversation_id as string,
              senderId: msg.sender_id as string,
              type: msg.type as string,
              ciphertext: msg.ciphertext as string,
              iv: '',
              plaintext,
              mediaUrl: msg.media_url as string | null,
              mediaMeta: msg.media_meta as Record<string, unknown> | null,
              replyToId: msg.reply_to_id as number | null,
              forwardedHops: (msg.forwarded_hops as number) ?? 0,
              viewOnce: (msg.view_once as boolean) ?? false,
              expiresAt: msg.expires_at as string | null,
              editedAt: msg.edited_at as string | null,
              isDeleted: (msg.is_deleted as boolean) ?? false,
              state: 'delivered' as MessageState,
              sentAt: msg.sent_at as string,
            };
            setMessages(prev => [...prev, dm]);
          }
          fetchConversations();
        },
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'direct_messages' },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const msg = payload.new as Record<string, unknown>;
          if (!msg) return;
          setMessages(prev => prev.map(m =>
            m.clientMsgId === (msg.client_msg_id as string) || m.id === (msg.id as number)
              ? { ...m, state: (msg.state as MessageState) ?? m.state, editedAt: msg.edited_at as string | null ?? m.editedAt }
              : m,
          ));
        },
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_status' },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const st = payload.new as Record<string, unknown>;
          if (!st || st.recipient_id !== user.id) return;
          if (st.read_at) {
            setMessages(prev => prev.map(m =>
              m.id === (st.message_id as number) ? { ...m, state: 'read' as MessageState } : m,
            ));
          } else if (st.delivered_at) {
            setMessages(prev => prev.map(m =>
              m.id === (st.message_id as number) ? { ...m, state: 'delivered' as MessageState } : m,
            ));
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, convKey, fetchConversations]);

  return {
    conversations,
    messages,
    activeConvId,
    loading,
    sending,
    conversationKey: convKey,
    openConversation,
    sendMessage,
    retryMessage,
    editMessage,
    deleteMessage,
    upsertReaction,
    removeReaction,
    starMessage,
    unstarMessage,
    getOrCreateConversation,
    initConversationKey,
    flushPendingMessages,
    refreshConversations: fetchConversations,
    setActiveConvId,
  };
}

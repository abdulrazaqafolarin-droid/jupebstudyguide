import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationsContext } from '@/contexts/NotificationsContext';

interface MessagePayload {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  group_name?: string;
}

interface FriendRequestPayload {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
}

export function useChatNotifications() {
  const { user } = useAuth();
  const { push } = useNotificationsContext();
  const userConvIds = useRef<Set<string>>(new Set());
  const profileCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user) return;
    const convSet = new Set<string>();

    const loadConvs = async () => {
      const { data } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);
      if (data) {
        convSet.clear();
        data.forEach(p => convSet.add(p.conversation_id));
        userConvIds.current = convSet;
      }
    };
    loadConvs();

    const getSenderName = async (senderId: string): Promise<string> => {
      const cached = profileCache.current.get(senderId);
      if (cached) return cached;
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', senderId)
        .single();
      const name = (data as { display_name: string | null } | null)?.display_name || 'Someone';
      profileCache.current.set(senderId, name);
      return name;
    };

    const msgChannel = supabase
      .channel('chat-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const msg = payload.new as MessagePayload;
          if (msg.sender_id === user.id) return;
          if (!userConvIds.current.has(msg.conversation_id)) return;

          const senderName = await getSenderName(msg.sender_id);
          const preview = msg.content?.slice(0, 80) || (msg.group_name ? 'Group created' : 'Sent an image');
          const title = msg.group_name
            ? `${senderName} in ${msg.group_name}`
            : senderName;
          push({
            kind: 'chat_message',
            title,
            body: preview,
            dedupe: `msg:${msg.id}`,
          });
        }
      )
      .subscribe();

    const frChannel = supabase
      .channel('friend-request-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const fr = payload.new as FriendRequestPayload;
          if (fr.sender_id === user.id) return;
          const senderName = await getSenderName(fr.sender_id);
          push({
            kind: 'friend_request',
            title: 'Friend Request',
            body: `${senderName} wants to connect with you`,
            dedupe: `fr:${fr.id}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(frChannel);
    };
  }, [user, push]);
}

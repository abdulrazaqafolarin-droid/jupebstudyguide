import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PresenceState {
  user_id: string;
  online_at: string;
  typing_in: string | null; // conversation_id or null
}

export function usePresence(activeConversation: string | null) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('chat-presence', {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        const online = new Set<string>();
        const typing = new Set<string>();

        Object.values(state).forEach((presences) => {
          presences.forEach((p) => {
            online.add(p.user_id);
            if (p.typing_in && p.typing_in === activeConversation && p.user_id !== user.id) {
              typing.add(p.user_id);
            }
          });
        });

        setOnlineUsers(online);
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
            typing_in: null,
          } as PresenceState);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [user, activeConversation]);

  const setTyping = useCallback((isTyping: boolean) => {
    if (!user || !channelRef.current) return;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    channelRef.current.track({
      user_id: user.id,
      online_at: new Date().toISOString(),
      typing_in: isTyping ? activeConversation : null,
    } as PresenceState);

    // Auto-clear typing after 3 seconds
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        channelRef.current?.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
          typing_in: null,
        } as PresenceState);
      }, 3000);
    }
  }, [user, activeConversation]);

  const isOnline = useCallback((userId: string) => onlineUsers.has(userId), [onlineUsers]);
  const isTyping = useCallback((userId: string) => typingUsers.has(userId), [typingUsers]);

  return { onlineUsers, typingUsers, setTyping, isOnline, isTyping };
}

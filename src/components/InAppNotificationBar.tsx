import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';

interface PopupNotification {
  id: string;
  kind: 'chat_message' | 'friend_request' | 'group_add';
  title: string;
  body: string;
  senderId?: string;
  conversationId?: string;
  avatarUrl?: string | null;
}

export function InAppNotificationBar({
  onOpenConversation,
  onOpenFriendsTab,
}: {
  onOpenConversation?: (convId: string) => void;
  onOpenFriendsTab?: () => void;
}) {
  const { user } = useAuth();
  const [current, setCurrent] = useState<PopupNotification | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const dismissedRef = useRef<Set<string>>(new Set());

  const show = useCallback((n: PopupNotification) => {
    if (dismissedRef.current.has(n.id)) return;
    setCurrent(n);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setCurrent(null);
    }, 5000);
  }, []);

  const dismiss = useCallback(() => {
    if (current) dismissedRef.current.add(current.id);
    setCurrent(null);
    clearTimeout(timeoutRef.current);
  }, [current]);

  useEffect(() => {
    if (!user) return;

    const msgChannel = supabase
      .channel('inapp-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const msg = payload.new as {
            id: string; conversation_id: string; sender_id: string;
            content?: string; message_type?: string; group_name?: string;
          };
          if (msg.sender_id === user.id) return;

          // Check if user is participant
          const { data: part } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', user.id)
            .eq('conversation_id', msg.conversation_id)
            .single();
          if (!part) return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', msg.sender_id)
            .single();

          const preview = msg.message_type === 'image' ? '📷 Photo'
            : msg.message_type === 'video' ? '🎥 Video'
            : msg.message_type === 'audio' ? '🎵 Audio'
            : msg.message_type === 'file' ? '📎 File'
            : msg.content?.slice(0, 80) || 'Message';

          show({
            id: `msg-${msg.id}`,
            kind: 'chat_message',
            title: (profile as { display_name: string | null })?.display_name || 'Someone',
            body: preview,
            senderId: msg.sender_id,
            conversationId: msg.conversation_id,
            avatarUrl: (profile as { avatar_url: string | null })?.avatar_url,
          });
        }
      )
          .subscribe();

    const frChannel = supabase
      .channel('inapp-fr-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${user.id}` },
        async (payload) => {
          const fr = payload.new as { id: string; sender_id: string };
          if (fr.sender_id === user.id) return;
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', fr.sender_id)
            .single();
          show({
            id: `fr-${fr.id}`,
            kind: 'friend_request',
            title: 'Friend Request',
            body: `${(profile as { display_name: string | null })?.display_name || 'Someone'} wants to connect`,
            senderId: fr.sender_id,
            avatarUrl: (profile as { avatar_url: string | null })?.avatar_url,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'friend_requests', filter: `status=eq.accepted` },
        async (payload) => {
          const fr = payload.new as { id: string; sender_id: string; receiver_id: string };
          const otherId = fr.sender_id === user.id ? fr.receiver_id : fr.receiver_id === user.id ? fr.sender_id : null;
          if (!otherId) return;
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', otherId)
            .single();
          show({
            id: `fr-accepted-${fr.id}`,
            kind: 'friend_request',
            title: 'Friend Request Accepted',
            body: `${(profile as { display_name: string | null })?.display_name || 'Someone'} accepted your friend request`,
            senderId: otherId,
            avatarUrl: (profile as { avatar_url: string | null })?.avatar_url,
          });
        }
      )
      .subscribe();

    const groupAddChannel = supabase
      .channel('inapp-group-add')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${user.id}` },
        async (payload) => {
          const row = payload.new as { conversation_id: string };
          const { data: conv } = await supabase
            .from('conversations')
            .select('group_name')
            .eq('id', row.conversation_id)
            .single();
          const groupTitle = (conv as { group_name: string | null } | null)?.group_name || 'a group';
          show({
            id: `group-add-${row.conversation_id}`,
            kind: 'group_add',
            title: 'Added to Group',
            body: `You were added to ${groupTitle}`,
            conversationId: row.conversation_id,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(frChannel);
      supabase.removeChannel(groupAddChannel);
    };
  }, [user, show]);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[90vw] max-w-sm"
        >
          <div className="bg-popover/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
            <div className="flex items-center gap-3 p-3">
              <UserAvatar
                url={current.avatarUrl}
                name={current.title}
                className="w-10 h-10 ring-2 ring-primary/20 shrink-0"
                targetUserId={current.senderId}
              />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => {
                dismiss();
                  if (current.kind === 'chat_message' && current.conversationId) {
                    onOpenConversation?.(current.conversationId);
                  } else if (current.kind === 'group_add' && current.conversationId) {
                    onOpenConversation?.(current.conversationId);
                  } else if (current.kind === 'friend_request') {
                    onOpenFriendsTab?.();
                  }
              }}>
                <p className="text-xs font-semibold text-foreground truncate">{current.title}</p>
                <p className="text-xs text-muted-foreground truncate">{current.body}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                {current.kind === 'friend_request' && (
                  <Button
                    size="sm"
                    className="h-7 text-[10px] rounded-lg bg-primary hover:bg-primary/90"
                    onClick={() => {
                      dismiss();
                      onOpenFriendsTab?.();
                    }}
                  >
                    View
                  </Button>
                )}
                {current.kind === 'chat_message' && (
                  <Button
                    size="sm"
                    className="h-7 text-[10px] rounded-lg bg-accent hover:bg-accent/90"
                    onClick={() => {
                      dismiss();
                      if (current.conversationId) {
                        onOpenConversation?.(current.conversationId);
                      }
                    }}
                  >
                    Reply
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 rounded-full p-0"
                  onClick={dismiss}
                >
                  <span className="text-muted-foreground text-xs">✕</span>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ChatUnreadContextValue {
  totalUnread: number;
  staleUnread: boolean;
  setTotalUnread: (count: number) => void;
  setStaleUnread: (stale: boolean) => void;
}

const ChatUnreadContext = createContext<ChatUnreadContextValue | null>(null);

export function ChatUnreadProvider({ children }: { children: ReactNode }) {
  const [totalUnread, setTotalUnread] = useState(0);
  const [staleUnread, setStaleUnread] = useState(false);
  const { user } = useAuth();

  const poll = useCallback(async (cancelled: { current: boolean }) => {
    if (!user || cancelled.current) return;
    try {
      const { data: participantData } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);

      if (!participantData || participantData.length === 0) {
        if (!cancelled.current) setTotalUnread(0);
        return;
      }

      let uniqueUnread = 0;
      const groupCheck: { conversationId: string; lastReadAt: string | null }[] = [];

      for (const p of participantData) {
        const { count: partCount } = await supabase
          .from('conversation_participants')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', p.conversation_id);

        const isGroup = (partCount ?? 0) > 2;

        if (isGroup) {
          groupCheck.push({ conversationId: p.conversation_id, lastReadAt: p.last_read_at });
          continue;
        }

        // DM: count unread messages directly
        const lastRead = p.last_read_at || new Date(0).toISOString();
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', p.conversation_id)
          .neq('sender_id', user.id)
          .gt('created_at', lastRead)
          .neq('is_deleted', true)
          .neq('message_type', 'system');

        if ((count ?? 0) > 0) uniqueUnread++;
      }

      // Groups: use RPC
      if (groupCheck.length > 0) {
        const { data: groupUnreadData } = await supabase
          .rpc('get_unread_counts', { p_user_id: user.id });

        if (groupUnreadData) {
          const convIds = new Set(groupCheck.map(g => g.conversationId));
          for (const row of groupUnreadData as { conversation_id: string; count: number }[]) {
            if (convIds.has(row.conversation_id) && Number(row.count) > 0) {
              uniqueUnread++;
            }
          }
        }
      }

      if (!cancelled.current) {
        setTotalUnread(uniqueUnread);
        setStaleUnread(false);
      }
    } catch {
      if (!cancelled.current) setStaleUnread(true);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const cancelled = { current: false };

    poll(cancelled);
    const interval = setInterval(() => poll(cancelled), 5000);

    return () => {
      cancelled.current = true;
      clearInterval(interval);
    };
  }, [user, poll]);

  return (
    <ChatUnreadContext.Provider value={{ totalUnread, staleUnread, setTotalUnread, setStaleUnread }}>
      {children}
    </ChatUnreadContext.Provider>
  );
}

export function useChatUnreadCount() {
  const ctx = useContext(ChatUnreadContext);
  if (!ctx) throw new Error("useChatUnreadCount must be used within ChatUnreadProvider");
  return ctx;
}

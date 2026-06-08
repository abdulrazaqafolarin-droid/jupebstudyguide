import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
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

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const { data: participantData } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id);

        if (!participantData || participantData.length === 0) {
          if (!cancelled) setTotalUnread(0);
          return;
        }

        const convIds = participantData.map(p => p.conversation_id);

        const { data: convData } = await supabase
          .from('conversations')
          .select('id, unread_count_a, unread_count_b')
          .in('id', convIds);

        if (!convData) return;

        const { data: allParticipants } = await supabase
          .from('conversation_participants')
          .select('conversation_id, user_id')
          .in('conversation_id', convIds);

        if (!allParticipants) return;

        const participantsByConv = new Map<string, string[]>();
        for (const p of allParticipants) {
          const list = participantsByConv.get(p.conversation_id) ?? [];
          list.push(p.user_id);
          participantsByConv.set(p.conversation_id, list);
        }

        let uniqueUnread = 0;
        const groupConvIds: string[] = [];

        for (const conv of convData) {
          const convParticipants = participantsByConv.get(conv.id) ?? [];
          if (convParticipants.length > 2) {
            groupConvIds.push(conv.id);
            continue;
          }
          const partA = convParticipants[0];
          const partB = convParticipants[1];
          let convUnread = 0;
          if (user.id === partA) {
            convUnread = conv.unread_count_a ?? 0;
          } else if (user.id === partB) {
            convUnread = conv.unread_count_b ?? 0;
          }
          if (convUnread > 0) uniqueUnread++;
        }

        if (groupConvIds.length > 0) {
          const { data: groupUnreadData } = await supabase
            .rpc('get_unread_counts', { p_user_id: user.id });

          if (groupUnreadData) {
            const seen = new Set(groupConvIds);
            for (const row of groupUnreadData as { conversation_id: string; count: number }[]) {
              if (seen.has(row.conversation_id) && Number(row.count) > 0) {
                uniqueUnread++;
              }
            }
          }
        }

        if (!cancelled) {
          setTotalUnread(uniqueUnread);
        }
      } catch {
        // silent — polling is best-effort
      }
    };

    poll();
    const interval = setInterval(poll, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

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

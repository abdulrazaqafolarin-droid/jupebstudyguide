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
      // Single server-side count for all conversations (no per-conv queries).
      const { data, error } = await supabase
        .rpc('get_unread_counts', { p_user_id: user.id });

      if (error) throw error;
      const uniqueUnread = ((data ?? []) as { conversation_id: string; count: number }[])
        .filter((row) => Number(row.count) > 0).length;

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

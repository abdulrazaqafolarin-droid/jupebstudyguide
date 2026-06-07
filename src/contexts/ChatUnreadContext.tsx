import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useGlobalRealtime } from "@/contexts/GlobalRealtimeProvider";

interface ChatUnreadContextValue {
  totalUnread: number;
  staleUnread: boolean;
  setTotalUnread: (count: number) => void;
  setStaleUnread: (stale: boolean) => void;
  refreshUnread: () => void;
}

const ChatUnreadContext = createContext<ChatUnreadContextValue | null>(null);

export function ChatUnreadProvider({ children }: { children: ReactNode }) {
  const { totalUnread: globalTotal, refreshUnread } = useGlobalRealtime();
  const [totalUnread, setTotalUnread] = useState(0);
  const [staleUnread, setStaleUnread] = useState(false);

  useEffect(() => {
    setTotalUnread(globalTotal);
  }, [globalTotal]);

  const handleRefresh = useCallback(() => {
    refreshUnread();
  }, [refreshUnread]);

  return (
    <ChatUnreadContext.Provider
      value={{
        totalUnread,
        staleUnread,
        setTotalUnread,
        setStaleUnread,
        refreshUnread: handleRefresh,
      }}
    >
      {children}
    </ChatUnreadContext.Provider>
  );
}

export function useChatUnreadCount() {
  const ctx = useContext(ChatUnreadContext);
  if (!ctx) throw new Error("useChatUnreadCount must be used within ChatUnreadProvider");
  return ctx;
}

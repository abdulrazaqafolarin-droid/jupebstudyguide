import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

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

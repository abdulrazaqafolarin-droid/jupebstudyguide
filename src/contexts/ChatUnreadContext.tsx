import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  countUnreadConversations,
  shouldCountIncomingChatMessage,
  type IncomingChatMessage,
} from "@/lib/chat-unread";

interface ChatUnreadContextValue {
  totalUnread: number;
  staleUnread: boolean;
  setTotalUnread: (count: number) => void;
  setStaleUnread: (stale: boolean) => void;
}

interface ConversationParticipantRow {
  conversation_id: string;
  last_read_at: string | null;
}

interface UnreadCountRow {
  conversation_id: string;
  count: number | string;
}

const ChatUnreadContext = createContext<ChatUnreadContextValue | null>(null);
const UNREAD_CACHE_PREFIX = "jupeb-global-unread:v1:";
const UNREAD_CACHE_MAX_AGE_MS = 5 * 60 * 1000;
const RECONNECT_BASE_MS = 1500;
const RECONNECT_MAX_MS = 30000;

function readUnreadCache(userId: string): Record<string, number> | null {
  try {
    const raw = localStorage.getItem(`${UNREAD_CACHE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      timestamp?: number;
      counts?: Record<string, unknown>;
    };
    if (
      !Number.isFinite(parsed.timestamp) ||
      Date.now() - Number(parsed.timestamp) > UNREAD_CACHE_MAX_AGE_MS ||
      !parsed.counts ||
      typeof parsed.counts !== "object"
    ) return null;

    const counts: Record<string, number> = {};
    for (const [conversationId, value] of Object.entries(parsed.counts)) {
      const count = Number(value);
      if (Number.isFinite(count) && count > 0) counts[conversationId] = count;
    }
    return counts;
  } catch {
    return null;
  }
}

export function ChatUnreadProvider({ children }: { children: ReactNode }) {
  const [totalUnread, setTotalUnread] = useState(0);
  const [staleUnread, setStaleUnread] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      setTotalUnread(0);
      setStaleUnread(false);
      return;
    }

    let disposed = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    let snapshotInFlight = false;
    let refreshAgain = false;
    let hasSnapshot = false;

    const lastReadAtByConversation = new Map<string, string | null>();
    const unreadByConversation = new Map<string, number>();

    const cachedCounts = readUnreadCache(userId);
    if (cachedCounts) {
      for (const [conversationId, count] of Object.entries(cachedCounts)) {
        unreadByConversation.set(conversationId, count);
      }
      setTotalUnread(countUnreadConversations(unreadByConversation.values()));
      setStaleUnread(true);
    } else {
      unreadByConversation.clear();
      setTotalUnread(0);
      setStaleUnread(true);
    }

    const publish = () => {
      if (disposed) return;
      setTotalUnread(countUnreadConversations(unreadByConversation.values()));
      setStaleUnread(false);
      try {
        const counts: Record<string, number> = {};
        for (const [conversationId, count] of unreadByConversation) {
          if (count > 0) counts[conversationId] = count;
        }
        localStorage.setItem(UNREAD_CACHE_PREFIX + userId, JSON.stringify({
          timestamp: Date.now(),
          counts,
        }));
      } catch {
        // The realtime state remains usable when local storage is unavailable.
      }
    };

    const scheduleSnapshot = (delay = 100) => {
      if (disposed) return;
      if (snapshotInFlight || !hasSnapshot) {
        refreshAgain = true;
        return;
      }
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void refreshSnapshot();
      }, delay);
    };

    const refreshSnapshot = async () => {
      if (disposed) return;
      if (snapshotInFlight) {
        refreshAgain = true;
        return;
      }

      snapshotInFlight = true;
      refreshAgain = false;
      try {
        // Subscribe first, then hydrate. Realtime events arriving during this
        // snapshot request ask for one follow-up snapshot, closing the gap
        // without double-incrementing messages already included in the RPC.
        const [participantsRes, unreadRes] = await Promise.all([
          supabase
            .from("conversation_participants")
            .select("conversation_id, last_read_at")
            .eq("user_id", userId),
          supabase.rpc("get_unread_counts", { p_user_id: userId }),
        ]);

        if (participantsRes.error) throw participantsRes.error;
        if (unreadRes.error) throw unreadRes.error;
        if (disposed) return;

        lastReadAtByConversation.clear();
        for (const row of (participantsRes.data ?? []) as ConversationParticipantRow[]) {
          lastReadAtByConversation.set(row.conversation_id, row.last_read_at ?? null);
        }

        unreadByConversation.clear();
        for (const row of (unreadRes.data ?? []) as UnreadCountRow[]) {
          const count = Number(row.count);
          if (Number.isFinite(count) && count > 0) {
            unreadByConversation.set(row.conversation_id, count);
          }
        }

        hasSnapshot = true;
        publish();
      } catch (error) {
        if (!disposed) {
          console.warn("[chat-unread] realtime snapshot failed:", error);
          setStaleUnread(true);
        }
      } finally {
        snapshotInFlight = false;
        if (refreshAgain && !disposed) {
          refreshAgain = false;
          scheduleSnapshot(80);
        }
      }
    };

    const handleIncomingMessage = (message: IncomingChatMessage) => {
      if (disposed) return;
      if (!hasSnapshot || snapshotInFlight) {
        refreshAgain = true;
        return;
      }
      if (!lastReadAtByConversation.has(message.conversation_id)) {
        // A membership change may have reached this client before its
        // participant INSERT event; reconcile once rather than losing it.
        scheduleSnapshot();
        return;
      }

      const lastReadAt = lastReadAtByConversation.get(message.conversation_id) ?? null;
      if (!shouldCountIncomingChatMessage(message, userId, lastReadAt)) return;
      unreadByConversation.set(
        message.conversation_id,
        (unreadByConversation.get(message.conversation_id) ?? 0) + 1,
      );
      publish();
    };

    const handleParticipantUpdate = (row: ConversationParticipantRow) => {
      if (disposed) return;
      if (!row?.conversation_id) return;
      if (!hasSnapshot || snapshotInFlight) {
        refreshAgain = true;
        return;
      }

      if (!lastReadAtByConversation.has(row.conversation_id)) {
        scheduleSnapshot();
        return;
      }

      const previous = lastReadAtByConversation.get(row.conversation_id) ?? null;
      const next = row.last_read_at ?? null;
      if (previous === next) return;

      // mark_conversation_read updates this row on every device. Its Realtime
      // UPDATE is the authoritative clear event for this conversation's badge.
      lastReadAtByConversation.set(row.conversation_id, next);
      unreadByConversation.set(row.conversation_id, 0);
      publish();
    };

    const scheduleReconnect = () => {
      if (disposed || retryTimer) return;
      const delay = Math.min(
        RECONNECT_BASE_MS * Math.pow(1.7, reconnectAttempts),
        RECONNECT_MAX_MS,
      );
      reconnectAttempts += 1;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        connect();
      }, delay + Math.floor(Math.random() * 500));
    };

    const connect = () => {
      if (disposed || channel) return;

      const nextChannel = supabase
        .channel(`chat-unread-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `sender_id=neq.${userId}`,
          },
          (payload) => handleIncomingMessage(payload.new as IncomingChatMessage),
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "conversation_participants",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => handleParticipantUpdate(payload.new as ConversationParticipantRow),
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "conversation_participants",
            filter: `user_id=eq.${userId}`,
          },
          () => scheduleSnapshot(),
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "conversation_participants",
            filter: `user_id=eq.${userId}`,
          },
          () => scheduleSnapshot(),
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages" },
          (payload) => {
            const updated = payload.new as IncomingChatMessage;
            if (updated.sender_id !== userId && updated.is_deleted === true) {
              // Deletes are uncommon and the old row can be incomplete under
              // RLS; reconcile the exact aggregate from the server on change.
              scheduleSnapshot();
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "messages" },
          () => scheduleSnapshot(),
        )
        .subscribe((status, error) => {
          if (disposed) return;
          if (status === "SUBSCRIBED") {
            reconnectAttempts = 0;
            void refreshSnapshot();
            return;
          }

          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            if (channel !== nextChannel) return;
            channel = null;
            void supabase.removeChannel(nextChannel);
            if (error) console.warn("[chat-unread] realtime channel reconnecting:", error);
            scheduleReconnect();
          }
        });

      channel = nextChannel;
    };

    connect();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (refreshTimer) clearTimeout(refreshTimer);
      if (channel) void supabase.removeChannel(channel);
      channel = null;
    };
  }, [user?.id]);

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

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type?: string;
  is_read: boolean;
  created_at: string;
  [key: string]: unknown;
}

interface ConversationPreview {
  id: string;
  name?: string;
  avatar_url?: string;
  last_message?: {
    content: string;
    sender_id: string;
    created_at: string;
  };
  unread_count: number;
  updated_at: string;
  [key: string]: unknown;
}

interface TypingState {
  [conversationId: string]: string[];
}

interface RecordingState {
  [conversationId: string]: string[];
}

interface PopupEvent {
  id: string;
  kind: "chat_message" | "friend_request" | "friend_request_accepted" | "group_add";
  title: string;
  body: string;
  senderId?: string;
  conversationId?: string;
  avatarUrl?: string | null;
}

interface GlobalRealtimeContextType {
  newMessageEvent: Message | null;
  conversations: ConversationPreview[];
  setConversations: React.Dispatch<React.SetStateAction<ConversationPreview[]>>;
  totalUnread: number;
  refreshUnread: () => void;
  markConversationRead: (conversationId: string) => void;
  presenceMap: Record<string, "online" | "offline">;
  typingState: TypingState;
  broadcastTyping: (conversationId: string, isTyping: boolean) => void;
  recordingState: RecordingState;
  broadcastRecording: (conversationId: string, isRecording: boolean) => void;
  currentUserId: string | null;
  popupEvent: PopupEvent | null;
  dismissPopup: () => void;
  broadcastMessage: (message: Message) => void;
}

const GlobalRealtimeContext = createContext<GlobalRealtimeContextType>({
  newMessageEvent: null,
  conversations: [],
  setConversations: () => {},
  totalUnread: 0,
  refreshUnread: () => {},
  markConversationRead: () => {},
  presenceMap: {},
  typingState: {},
  broadcastTyping: () => {},
  recordingState: {},
  broadcastRecording: () => {},
  currentUserId: null,
  popupEvent: null,
  dismissPopup: () => {},
  broadcastMessage: () => {},
});

export function GlobalRealtimeProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newMessageEvent, setNewMessageEvent] = useState<Message | null>(null);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [presenceMap, setPresenceMap] = useState<Record<string, "online" | "offline">>({});
  const [typingState, setTypingState] = useState<TypingState>({});
  const [recordingState, setRecordingState] = useState<RecordingState>({});
  const [popupEvent, setPopupEvent] = useState<PopupEvent | null>(null);
  const popupTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const dismissedPopupsRef = useRef<Set<string>>(new Set());
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const activeConvRef = useRef<string | null>(null);

  const dismissPopup = useCallback(() => {
    if (popupEvent) dismissedPopupsRef.current.add(popupEvent.id);
    setPopupEvent(null);
    clearTimeout(popupTimeoutRef.current);
  }, [popupEvent]);

  const showPopup = useCallback((n: PopupEvent) => {
    if (dismissedPopupsRef.current.has(n.id)) return;
    setPopupEvent(n);
    clearTimeout(popupTimeoutRef.current);
    popupTimeoutRef.current = setTimeout(() => setPopupEvent(null), 5000);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setCurrentUserId(session?.user?.id ?? null);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const { data, error } = await supabase
        .rpc("get_unread_counts", { p_user_id: currentUserId });
      if (error) return;
      const total = (data ?? []).reduce(
        (sum, row) => sum + Number((row as { count: number }).count),
        0
      );
      setTotalUnread(total);
    } catch { /* silent */ }
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) refreshUnread();
  }, [currentUserId, refreshUnread]);

  const markConversationRead = useCallback(async (conversationId: string) => {
    if (!currentUserId) return;
    await supabase
      .from("messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", currentUserId)
      .eq("is_read", false);
    await supabase
      .rpc("mark_conversation_read", {
        p_conversation_id: conversationId,
        p_user_id: currentUserId,
      });
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      )
    );
    refreshUnread();
    try {
      const bc = new BroadcastChannel("jupeb-unread-sync");
      bc.postMessage({ type: "read", conversationId });
      bc.close();
    } catch { /* BroadcastChannel not available */ }
  }, [currentUserId, refreshUnread]);

  const profileCache = useRef<Map<string, { display_name: string | null; avatar_url: string | null }>>(new Map());

  const getProfile = useCallback(async (userId: string) => {
    const cached = profileCache.current.get(userId);
    if (cached) return cached;
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", userId)
      .single();
    const profile = (data ?? { display_name: null, avatar_url: null }) as { display_name: string | null; avatar_url: string | null };
    profileCache.current.set(userId, profile);
    return profile;
  }, []);

  const broadcastMessage = useCallback((message: Message) => {
    broadcastChannelRef.current?.send({
      type: "broadcast",
      event: "msg",
      payload: { message },
    });
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const mainChannel = supabase.channel("global_realtime_main")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const msg = payload.new as Message;
        setNewMessageEvent(msg);

        if (msg.sender_id !== currentUserId) {
          setTotalUnread((prev) => prev + 1);
          setConversations((prev) => {
            const existingIndex = prev.findIndex((c) => c.id === msg.conversation_id);
            if (existingIndex === -1) return prev;
            const updated = {
              ...prev[existingIndex],
              updated_at: msg.created_at,
              unread_count: (prev[existingIndex].unread_count ?? 0) + 1,
            };
            const rest = prev.filter((c) => c.id !== msg.conversation_id);
            return [updated, ...rest];
          });

          const profile = await getProfile(msg.sender_id);
          const preview = msg.message_type === "image" ? "Photo"
            : msg.message_type === "video" ? "Video"
            : msg.message_type === "audio" ? "Audio"
            : msg.message_type === "file" ? "File"
            : msg.content?.slice(0, 80) || "Message";
          showPopup({
            id: `msg-${msg.id}`,
            kind: "chat_message",
            title: profile.display_name || "Someone",
            body: preview,
            senderId: msg.sender_id,
            conversationId: msg.conversation_id,
            avatarUrl: profile.avatar_url,
          });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const oldMsg = payload.old as { is_read: boolean };
        const newMsg = payload.new as Message & { is_deleted?: boolean };
        if (newMsg.sender_id !== currentUserId && newMsg.is_read && !oldMsg.is_read) {
          setTotalUnread((prev) => Math.max(0, prev - 1));
        }
        setNewMessageEvent(newMsg);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload) => {
        const oldMsg = payload.old as { conversation_id: string; sender_id: string; is_read: boolean };
        if (oldMsg.sender_id !== currentUserId && !oldMsg.is_read) {
          setTotalUnread((prev) => Math.max(0, prev - 1));
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_participants", filter: `user_id=eq.${currentUserId}` }, async (payload) => {
        const row = payload.new as { conversation_id: string };
        refreshUnread();
        const { data: conv } = await supabase
          .from("conversations")
          .select("group_name")
          .eq("id", row.conversation_id)
          .single();
        const groupTitle = (conv as { group_name: string | null } | null)?.group_name || "a group";
        showPopup({
          id: `group-add-${row.conversation_id}`,
          kind: "group_add",
          title: "Added to Group",
          body: `You were added to ${groupTitle}`,
          conversationId: row.conversation_id,
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "friend_requests", filter: `receiver_id=eq.${currentUserId}` }, async (payload) => {
        const fr = payload.new as { id: string; sender_id: string };
        if (fr.sender_id === currentUserId) return;
        const profile = await getProfile(fr.sender_id);
        showPopup({
          id: `fr-${fr.id}`,
          kind: "friend_request",
          title: "Friend Request",
          body: `${profile.display_name || "Someone"} wants to connect`,
          senderId: fr.sender_id,
          avatarUrl: profile.avatar_url,
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "friend_requests" }, async (payload) => {
        const oldRow = payload.old as { status: string };
        const newRow = payload.new as { id: string; sender_id: string; receiver_id: string; status: string };
        if (newRow.status === "accepted" && oldRow.status !== "accepted") {
          const otherId = newRow.sender_id === currentUserId ? newRow.receiver_id
            : newRow.receiver_id === currentUserId ? newRow.sender_id
            : null;
          if (!otherId) return;
          const profile = await getProfile(otherId);
          showPopup({
            id: `fr-accepted-${newRow.id}`,
            kind: "friend_request_accepted",
            title: "Friend Request Accepted",
            body: `${profile.display_name || "Someone"} accepted your request`,
            senderId: otherId,
            avatarUrl: profile.avatar_url,
          });
        }
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("[GlobalRealtime] main channel error");
        }
      });

    const presenceChannel = supabase.channel("chat-presence", {
      config: { presence: { key: currentUserId } },
    });
    const handleVisibility = () => {
      const state = document.visibilityState === "visible"
        ? { user_id: currentUserId, online_at: new Date().toISOString(), typing_in: null, recording_vn_in: null }
        : { user_id: currentUserId, online_at: new Date().toISOString(), typing_in: null, recording_vn_in: null };
      presenceChannel.track(state);
    };
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState<{
          user_id: string;
          online_at: string;
          typing_in: string | null;
          recording_vn_in: string | null;
        }>();
        const online: Record<string, "online" | "offline"> = {};
        const typing: TypingState = {};
        const recording: RecordingState = {};
        Object.entries(state).forEach(([key, presences]) => {
          presences.forEach((p) => {
            if (p.user_id === currentUserId) return;
            online[p.user_id] = "online";
            if (p.typing_in && p.typing_in === activeConvRef.current) {
              const list = typing[p.typing_in] ?? [];
              list.push(p.user_id);
              typing[p.typing_in] = list;
            }
            if (p.recording_vn_in && p.recording_vn_in === activeConvRef.current) {
              const list = recording[p.recording_vn_in] ?? [];
              list.push(p.user_id);
              recording[p.recording_vn_in] = list;
            }
          });
        });
        setPresenceMap((prev) => ({ ...prev, ...online }));
        setTypingState(typing);
        setRecordingState(recording);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          presenceChannelRef.current = presenceChannel;
          await presenceChannel.track({
            user_id: currentUserId,
            online_at: new Date().toISOString(),
            typing_in: null,
            recording_vn_in: null,
          });
          document.addEventListener("visibilitychange", handleVisibility);
        } else if (status === "CHANNEL_ERROR" || status === "CLOSED" || status === "TIMED_OUT") {
          presenceChannelRef.current = null;
        }
      });

    const broadcastChannel = supabase
      .channel("msg-broadcast", { selfBroadcast: false })
      .on("broadcast", { event: "msg" }, (payload) => {
        const msg = payload.payload.message as Message;
        if (msg.sender_id !== currentUserId) {
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === msg.conversation_id);
            if (idx === -1) return prev;
            const updated = { ...prev[idx], updated_at: msg.created_at, unread_count: (prev[idx].unread_count ?? 0) + 1 };
            const rest = prev.filter((c) => c.id !== msg.conversation_id);
            return [updated, ...rest];
          });
          setTotalUnread((prev) => prev + 1);
          setNewMessageEvent(msg);
        }
      })
      .subscribe();
    broadcastChannelRef.current = broadcastChannel;

    return () => {
      supabase.removeChannel(mainChannel);
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(broadcastChannel);
      presenceChannelRef.current = null;
      broadcastChannelRef.current = null;
    };
  }, [currentUserId, getProfile, showPopup, refreshUnread]);

  const broadcastTyping = useCallback((conversationId: string, isTyping: boolean) => {
    if (!presenceChannelRef.current) return;
    if (typingTimeoutsRef.current[`typing-${conversationId}`]) {
      clearTimeout(typingTimeoutsRef.current[`typing-${conversationId}`]);
    }
    presenceChannelRef.current.track({
      user_id: currentUserId,
      typing_in: isTyping ? conversationId : null,
    } as Record<string, unknown>);
    if (isTyping) {
      typingTimeoutsRef.current[`typing-${conversationId}`] = setTimeout(() => {
        presenceChannelRef.current?.track({
          user_id: currentUserId,
          typing_in: null,
        } as Record<string, unknown>);
      }, 3000);
    }
  }, [currentUserId]);

  const broadcastRecording = useCallback((conversationId: string, isRecording: boolean) => {
    if (!presenceChannelRef.current) return;
    presenceChannelRef.current.track({
      user_id: currentUserId,
      recording_vn_in: isRecording ? conversationId : null,
    } as Record<string, unknown>);
  }, [currentUserId]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel("jupeb-unread-sync");
    bc.onmessage = (event) => {
      if (event.data?.type === "read") {
        refreshUnread();
        setConversations((prev) =>
          prev.map((c) =>
            c.id === event.data.conversationId ? { ...c, unread_count: 0 } : c
          )
        );
      }
    };
    return () => bc.close();
  }, [refreshUnread]);

  return (
    <GlobalRealtimeContext.Provider
      value={{
        newMessageEvent,
        conversations,
        setConversations,
        totalUnread,
        refreshUnread,
        markConversationRead,
        presenceMap,
        typingState,
        broadcastTyping,
        recordingState,
        broadcastRecording,
        currentUserId,
        popupEvent,
        dismissPopup,
        broadcastMessage,
      }}
    >
      {children}
    </GlobalRealtimeContext.Provider>
  );
}

export function useGlobalRealtime() {
  return useContext(GlobalRealtimeContext);
}

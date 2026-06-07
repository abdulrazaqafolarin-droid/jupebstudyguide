import { useEffect } from "react";
import { useGlobalRealtime } from "@/contexts/GlobalRealtimeProvider";
import type { Message } from "./useChat";

interface UseRealtimeChatProps {
  conversationId: string | null;
  currentUserId: string | null;
  onNewMessage: (message: Message) => void;
}

export function useRealtimeChat({
  conversationId,
  currentUserId,
  onNewMessage,
}: UseRealtimeChatProps) {
  const { newMessageEvent } = useGlobalRealtime();

  useEffect(() => {
    if (!newMessageEvent || !conversationId || !currentUserId) return;
    if (newMessageEvent.sender_id === currentUserId) return;
    if (newMessageEvent.conversation_id !== conversationId) return;
    onNewMessage(newMessageEvent);
  }, [newMessageEvent, conversationId, currentUserId, onNewMessage]);
}

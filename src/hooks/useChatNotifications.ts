import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationsContext } from "@/contexts/NotificationsContext";
import { useGlobalRealtime } from "@/contexts/GlobalRealtimeProvider";
import { supabase } from "@/integrations/supabase/client";

export function useChatNotifications() {
  const { user } = useAuth();
  const { push } = useNotificationsContext();
  const { newMessageEvent } = useGlobalRealtime();
  const userConvIds = useRef<Set<string>>(new Set());
  const profileCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user) return;
    const convSet = new Set<string>();
    supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) {
          data.forEach((p) => convSet.add(p.conversation_id));
          userConvIds.current = convSet;
        }
      });
  }, [user]);

  useEffect(() => {
    if (!user || !newMessageEvent) return;
    if (newMessageEvent.sender_id === user.id) return;
    if (!userConvIds.current.has(newMessageEvent.conversation_id)) return;

    const cacheKey = newMessageEvent.sender_id;
    const cached = profileCache.current.get(cacheKey);
    const senderName = cached || "Someone";

    if (!cached) {
      supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", cacheKey)
        .single()
        .then(({ data }) => {
          const name = (data as { display_name: string | null } | null)?.display_name || "Someone";
          profileCache.current.set(cacheKey, name);
        });
    }

    const preview = newMessageEvent.content?.slice(0, 80) || "Sent an image";

    push({
      kind: "chat_message",
      title: senderName,
      body: preview,
      dedupe: `msg:${newMessageEvent.id}`,
    });
  }, [newMessageEvent, user, push]);
}

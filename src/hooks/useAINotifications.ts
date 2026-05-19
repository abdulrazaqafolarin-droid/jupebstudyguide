import { useCallback } from "react";
import { generateAINotification, canSendAINotification } from "@/lib/ai-notifications";
import type { AppNotification } from "./useNotifications";
import type { AIEventContext } from "@/lib/ai-notifications";

interface UseAINotificationsOptions {
  push: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
}

export function useAINotifications({ push }: UseAINotificationsOptions) {
  const triggerAI = useCallback(async (context: AIEventContext) => {
    if (!canSendAINotification()) return;
    const notification = await generateAINotification(context);
    if (notification) push(notification);
  }, [push]);

  return { triggerAI, canSendAI: canSendAINotification };
}

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGlobalRealtime } from "@/contexts/GlobalRealtimeProvider";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";

export function InAppNotificationBar({
  onOpenConversation,
  onOpenFriendsTab,
}: {
  onOpenConversation?: (convId: string) => void;
  onOpenFriendsTab?: () => void;
}) {
  const { popupEvent: current, dismissPopup } = useGlobalRealtime();

  const dismiss = useCallback(() => {
    dismissPopup();
  }, [dismissPopup]);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[90vw] max-w-sm"
        >
          <div className="bg-popover/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
            <div className="flex items-center gap-3 p-3">
              <UserAvatar
                url={current.avatarUrl}
                name={current.title}
                className="w-10 h-10 ring-2 ring-primary/20 shrink-0"
                targetUserId={current.senderId}
              />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => {
                dismiss();
                if (current.kind === "chat_message" && current.conversationId) {
                  onOpenConversation?.(current.conversationId);
                } else if (current.kind === "group_add" && current.conversationId) {
                  onOpenConversation?.(current.conversationId);
                } else if (current.kind === "friend_request" || current.kind === "friend_request_accepted") {
                  onOpenFriendsTab?.();
                }
              }}>
                <p className="text-xs font-semibold text-foreground truncate">{current.title}</p>
                <p className="text-xs text-muted-foreground truncate">{current.body}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                {(current.kind === "friend_request" || current.kind === "friend_request_accepted") && (
                  <Button
                    size="sm"
                    className="h-7 text-[10px] rounded-lg bg-primary hover:bg-primary/90"
                    onClick={() => {
                      dismiss();
                      onOpenFriendsTab?.();
                    }}
                  >
                    View
                  </Button>
                )}
                {current.kind === "chat_message" && (
                  <Button
                    size="sm"
                    className="h-7 text-[10px] rounded-lg bg-accent hover:bg-accent/90"
                    onClick={() => {
                      dismiss();
                      if (current.conversationId) {
                        onOpenConversation?.(current.conversationId);
                      }
                    }}
                  >
                    Reply
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 rounded-full p-0"
                  onClick={dismiss}
                >
                  <span className="text-muted-foreground text-xs">✕</span>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { createContext, useContext, useCallback, useRef } from "react";
import { useGlobalRealtime } from "@/contexts/GlobalRealtimeProvider";

interface PresenceContextValue {
  isOnline: (userId: string) => boolean;
  isTyping: (userId: string) => boolean;
  isRecordingVn: (userId: string) => boolean;
  setTyping: (isTyping: boolean) => void;
  setRecordingVn: (isRecording: boolean) => void;
  setActiveConversation: (convId: string | null) => void;
  getLastSeen: (userId: string) => string | null;
}

const PresenceContext = createContext<PresenceContextValue>({
  isOnline: () => false,
  isTyping: () => false,
  isRecordingVn: () => false,
  setTyping: () => {},
  setRecordingVn: () => {},
  setActiveConversation: () => {},
  getLastSeen: () => null,
});

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const {
    presenceMap,
    typingState,
    recordingState,
    broadcastTyping,
    broadcastRecording,
    currentUserId,
  } = useGlobalRealtime();

  const activeConvRef = useRef<string | null>(null);
  const lastSeenCache = useRef<Record<string, string>>({});

  const isOnline = useCallback(
    (userId: string) => presenceMap[userId] === "online",
    [presenceMap]
  );

  const isTyping = useCallback(
    (userId: string) => {
      for (const users of Object.values(typingState)) {
        if (users.includes(userId)) return true;
      }
      return false;
    },
    [typingState]
  );

  const isRecordingVn = useCallback(
    (userId: string) => {
      for (const users of Object.values(recordingState)) {
        if (users.includes(userId)) return true;
      }
      return false;
    },
    [recordingState]
  );

  const setTyping = useCallback(
    (typing: boolean) => {
      if (activeConvRef.current) {
        broadcastTyping(activeConvRef.current, typing);
      }
    },
    [broadcastTyping]
  );

  const setRecordingVn = useCallback(
    (recording: boolean) => {
      if (activeConvRef.current) {
        broadcastRecording(activeConvRef.current, recording);
      }
    },
    [broadcastRecording]
  );

  const setActiveConversation = useCallback((convId: string | null) => {
    activeConvRef.current = convId;
  }, []);

  const getLastSeen = useCallback(
    (userId: string) => {
      if (presenceMap[userId] === "online") return null;
      return lastSeenCache.current[userId] ?? null;
    },
    [presenceMap]
  );

  return (
    <PresenceContext.Provider
      value={{
        isOnline,
        isTyping,
        isRecordingVn,
        setTyping,
        setRecordingVn,
        setActiveConversation,
        getLastSeen,
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresenceContext() {
  return useContext(PresenceContext);
}

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PresenceState {
  user_id: string;
  online_at: string;
  typing_in: string | null;
  recording_vn_in: string | null;
}

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

const onlineStatusCache = new Map<string, { allowed: boolean; at: number }>();
const ONLINE_STATUS_TTL_MS = 5 * 60 * 1000;
const ONLINE_STATUS_MAX = 500;

async function canViewOnlineStatus(viewerId: string, targetId: string): Promise<boolean> {
  const cacheKey = `${viewerId}_${targetId}`;
  const cached = onlineStatusCache.get(cacheKey);
  if (cached && Date.now() - cached.at < ONLINE_STATUS_TTL_MS) return cached.allowed;
  try {
    const { data } = await supabase.rpc('can_view_online_status', { p_target_user_id: targetId });
    const allowed = data !== false;
    if (onlineStatusCache.size >= ONLINE_STATUS_MAX) {
      const oldest = onlineStatusCache.keys().next().value;
      if (oldest) onlineStatusCache.delete(oldest);
    }
    onlineStatusCache.set(cacheKey, { allowed, at: Date.now() });
    return allowed;
  } catch {
    return true;
  }
}

async function canViewOnlineStatusMany(viewerId: string, targetIds: string[]): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  const now = Date.now();
  const uncached = targetIds.filter((id) => {
    const cached = onlineStatusCache.get(`${viewerId}_${id}`);
    if (cached && now - cached.at < ONLINE_STATUS_TTL_MS) {
      result.set(id, cached.allowed);
      return false;
    }
    return true;
  });
  if (uncached.length > 0) {
    try {
      // Chunk so large groups never silently drop members past the first 50.
      for (let i = 0; i < uncached.length; i += 50) {
        const chunk = uncached.slice(i, i + 50);
        const { data } = await supabase.rpc('can_view_online_status_many', {
          p_user_ids: chunk,
        });
        for (const row of ((data ?? []) as { user_id: string; allowed: boolean }[])) {
          result.set(row.user_id, row.allowed);
          if (onlineStatusCache.size >= ONLINE_STATUS_MAX) {
            const oldest = onlineStatusCache.keys().next().value;
            if (oldest) onlineStatusCache.delete(oldest);
          }
          onlineStatusCache.set(`${viewerId}_${row.user_id}`, { allowed: row.allowed, at: now });
        }
      }
      // Anyone the RPC didn't return defaults to visible.
      for (const id of uncached) {
        if (!result.has(id)) result.set(id, true);
      }
    } catch {
      for (const id of uncached) result.set(id, true);
    }
  }
  return result;
}

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [recordingUsers, setRecordingUsers] = useState<Set<string>>(new Set());
  const [lastSeenCache, setLastSeenCache] = useState<Record<string, string>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeConvRef = useRef<string | null>(null);
  const lastSeenInflight = useRef<Set<string>>(new Set());
  const visibilityHandlersRef = useRef<(() => void) | null>(null);
  const privacyFilterRef = useRef<Set<string>>(new Set());
  // Full presence payload we last tracked (track() REPLACES the whole state,
  // so partial updates must be merged, not sent raw).
  const myStateRef = useRef<PresenceState | null>(null);
  // Partial updates made before the channel subscribed, replayed on subscribe.
  const pendingTrackRef = useRef<Partial<PresenceState> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);

  const trackState = useCallback((partial: Partial<PresenceState>) => {
    if (!user) return;
    const merged: PresenceState = {
      user_id: user.id,
      online_at: myStateRef.current?.online_at ?? new Date().toISOString(),
      typing_in: myStateRef.current?.typing_in ?? null,
      recording_vn_in: myStateRef.current?.recording_vn_in ?? null,
      ...partial,
    };
    myStateRef.current = merged;
    const ch = channelRef.current;
    if (ch) {
      void ch.track(merged);
    } else {
      pendingTrackRef.current = { ...(pendingTrackRef.current ?? {}), ...partial };
    }
  }, [user]);

  // Mirror presence into the user_presence table. Live schema is
  // (user_id, status, last_seen, updated_at) — the earlier is_online /
  // typing_in / online_at columns don't exist on the live table, so every
  // write used to fail with an unknown-column error.
  const syncPresenceToDb = useCallback(async (data: {
    is_online?: boolean;
    last_seen_at?: string;
  }) => {
    if (!user) return;
    const row: { user_id: string; status?: string; last_seen?: string } = { user_id: user.id };
    row.status = data.is_online === false ? 'offline' : 'online';
    row.last_seen = data.last_seen_at ?? new Date().toISOString();
    const { error } = await supabase.from('user_presence').upsert(row);
    if (error) console.warn('[presence] user_presence upsert failed:', error.message);
  }, [user]);

  // Update last_seen_at in DB when user goes offline
  const updateLastSeen = useCallback(async () => {
    if (!user) return;
    try {
      await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('user_id', user.id);
    } catch { /* silent */ }
  }, [user]);

  const reconnectPresence = useCallback(() => {
    if (!user || channelRef.current) return;

    const channel = supabase.channel('chat-presence', {
      config: { presence: { key: user.id } },
    });
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        channel.untrack();
        updateLastSeen();
        syncPresenceToDb({ is_online: false, last_seen_at: new Date().toISOString() });

      } else {
        trackState({ online_at: new Date().toISOString(), typing_in: null, recording_vn_in: null });
        syncPresenceToDb({ is_online: true });
      }
    };
    const handleBeforeUnload = () => {
      channel.untrack();
      updateLastSeen();
      syncPresenceToDb({ is_online: false, last_seen_at: new Date().toISOString() });
    };
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        const userIds = Object.keys(state);

        const online = new Set<string>();
        const typing = new Set<string>();
        const recording = new Set<string>();
        const toCheck: string[] = [];
        Object.values(state).forEach((presences) => {
          presences.forEach((p) => {
            if (p.user_id === user.id) return;
            toCheck.push(p.user_id);
          });
        });
        if (toCheck.length > 0) {
          canViewOnlineStatusMany(user.id, toCheck).then((allowedMap) => {
            const filteredOnline = new Set<string>();
            const filteredTyping = new Set<string>();
            const filteredRecording = new Set<string>();
            for (const peerId of toCheck) {
              if (!allowedMap.get(peerId)) continue;
              filteredOnline.add(peerId);
              const presences = state[peerId] || [];
              presences.forEach((p) => {
                if (p.typing_in && p.typing_in === activeConvRef.current) {
                  filteredTyping.add(p.user_id);
                }
                if (p.recording_vn_in && p.recording_vn_in === activeConvRef.current) {
                  filteredRecording.add(p.user_id);
                }
              });
            }
            setOnlineUsers(filteredOnline);
            setTypingUsers(filteredTyping);
            setRecordingUsers(filteredRecording);
          });
        } else {
          setOnlineUsers(online);
          setTypingUsers(typing);
          setRecordingUsers(recording);
        }
      })
      .subscribe(async (status) => {

        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
          const now = new Date().toISOString();
          const queued = pendingTrackRef.current;
          pendingTrackRef.current = null;
          // Re-apply anything queued while disconnected (typing/recording),
          // otherwise start a clean online state.
          trackState({ online_at: now, typing_in: null, recording_vn_in: null, ...(queued ?? {}) });
          syncPresenceToDb({ is_online: true });

          document.addEventListener('visibilitychange', handleVisibilityChange);
          window.addEventListener('beforeunload', handleBeforeUnload);
          visibilityHandlersRef.current = () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
          };
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
          if (disposedRef.current) return;
          // A channel we tore down ourselves reports CLOSED — ignore it.
          if (channelRef.current !== null && channelRef.current !== channel) return;
          if (reconnectTimerRef.current) return;
          console.warn('[presence] channel', status, '— reconnecting in 3s');
          channelRef.current = null;
          visibilityHandlersRef.current?.();
          visibilityHandlersRef.current = null;
          void supabase.removeChannel(channel);
          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            reconnectPresence();
          }, 3000);
        }
      });
  }, [user, updateLastSeen, syncPresenceToDb, trackState]);

  useEffect(() => {
    if (!user) return;
    disposedRef.current = false;
    reconnectPresence();
    return () => {
      disposedRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      visibilityHandlersRef.current?.();
      visibilityHandlersRef.current = null;
      myStateRef.current = null;
      pendingTrackRef.current = null;
    };
  }, [user, reconnectPresence]);

  const setTyping = useCallback((isTyping: boolean) => {
    if (!user) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // trackState queues updates until the channel subscribes, so the first
    // keystrokes in a conversation are no longer silently dropped.
    trackState({ typing_in: isTyping ? activeConvRef.current : null });
    syncPresenceToDb({ is_online: true });

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        trackState({ typing_in: null });
      }, 3000);
    }
  }, [user, trackState, syncPresenceToDb]);

  const setRecordingVn = useCallback((isRecording: boolean) => {
    if (!user) return;
    trackState({ recording_vn_in: isRecording ? activeConvRef.current : null });
    syncPresenceToDb({ is_online: true });
  }, [user, trackState, syncPresenceToDb]);

  const setActiveConversation = useCallback((convId: string | null) => {
    activeConvRef.current = convId;
  }, []);

  const isOnline = useCallback((userId: string) => onlineUsers.has(userId), [onlineUsers]);
  const isTyping = useCallback((userId: string) => typingUsers.has(userId), [typingUsers]);
  const isRecordingVn = useCallback((userId: string) => recordingUsers.has(userId), [recordingUsers]);

  const getLastSeen = useCallback((userId: string) => {
    if (onlineUsers.has(userId)) return null;
    // '' = resolved-but-unavailable (privacy denied / never seen). Remember it
    // so callers polling the header don't refetch forever.
    if (userId in lastSeenCache) return lastSeenCache[userId] || null;
    // Dedupe in-flight lookups so group headers don't fan out N identical RPCs.
    if (!lastSeenInflight.current.has(userId)) {
      lastSeenInflight.current.add(userId);
      supabase.rpc('get_last_seen', { p_target_user_id: userId }).then(({ data, error }) => {
        lastSeenInflight.current.delete(userId);
        if (!error) {
          setLastSeenCache(prev => ({ ...prev, [userId]: data || '' }));
        }
      });
    }
    return null;
  }, [onlineUsers, lastSeenCache]);

  // Memoized so consumers' effects (e.g. Chat's active-conversation sync)
  // don't re-fire on every provider render.
  const value = useMemo(() => ({
    isOnline, isTyping, isRecordingVn, setTyping, setRecordingVn, setActiveConversation, getLastSeen,
  }), [isOnline, isTyping, isRecordingVn, setTyping, setRecordingVn, setActiveConversation, getLastSeen]);

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresenceContext() {
  return useContext(PresenceContext);
}

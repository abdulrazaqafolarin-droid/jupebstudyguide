import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
      const { data } = await supabase.rpc('can_view_online_status_many', {
        p_user_ids: uncached.slice(0, 50),
      });
      for (const row of ((data ?? []) as { user_id: string; allowed: boolean }[])) {
        result.set(row.user_id, row.allowed);
        if (onlineStatusCache.size >= ONLINE_STATUS_MAX) {
          const oldest = onlineStatusCache.keys().next().value;
          if (oldest) onlineStatusCache.delete(oldest);
        }
        onlineStatusCache.set(`${viewerId}_${row.user_id}`, { allowed: row.allowed, at: now });
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
  const visibilityHandlersRef = useRef<(() => void) | null>(null);
  const privacyFilterRef = useRef<Set<string>>(new Set());

  // Sync to user_presence table for postgres_changes subscribers
  const syncPresenceToDb = useCallback(async (data: {
    is_online?: boolean;
    last_seen_at?: string;
    online_at?: string;
    typing_in?: string | null;
    recording_vn_in?: string | null;
  }) => {
    if (!user) return;
    try {
      await supabase.from('user_presence').upsert({
        user_id: user.id,
        is_online: data.is_online ?? true,
        last_seen_at: data.last_seen_at ?? new Date().toISOString(),
        online_at: data.online_at ?? null,
        typing_in: data.typing_in ?? null,
        recording_vn_in: data.recording_vn_in ?? null,
      });
    } catch { /* silent */ }
  }, [user]);

  // Update last_seen_at in DB when user goes offline
  const updateLastSeen = useCallback(async () => {
    if (!user) return;
    try {
      await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id);
    } catch { /* silent */ }
  }, [user]);

  const reconnectPresence = useCallback(() => {
    if (!user || channelRef.current) return;
    console.log('[presence] connecting...');
    const channel = supabase.channel('chat-presence', {
      config: { presence: { key: user.id } },
    });
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        channel.untrack();
        updateLastSeen();
        syncPresenceToDb({ is_online: false, last_seen_at: new Date().toISOString() });
        console.log('[presence] tab hidden — untracked');
      } else {
        channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
          typing_in: null,
          recording_vn_in: null,
        } as PresenceState);
        syncPresenceToDb({ is_online: true, online_at: new Date().toISOString() });
        console.log('[presence] tab visible — tracked');
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
        console.log('[presence] sync — tracked users:', userIds);
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
        console.log('[presence] subscribe status:', status);
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
            typing_in: null,
            recording_vn_in: null,
          } as PresenceState);
          syncPresenceToDb({ is_online: true, online_at: new Date().toISOString() });
          console.log('[presence] tracked self as online');
          document.addEventListener('visibilitychange', handleVisibilityChange);
          window.addEventListener('beforeunload', handleBeforeUnload);
          visibilityHandlersRef.current = () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
          };
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
          console.warn('[presence] channel', status, '— reconnecting in 3s');
          channelRef.current = null;
          setTimeout(() => reconnectPresence(), 3000);
        }
      });
  }, [user, updateLastSeen]);

  useEffect(() => {
    if (!user) return;
    reconnectPresence();
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      visibilityHandlersRef.current?.();
      visibilityHandlersRef.current = null;
    };
  }, [user, reconnectPresence]);

  const setTyping = useCallback((isTyping: boolean) => {
    if (!user || !channelRef.current) {
      console.warn('[presence] setTyping skipped — no channel');
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    console.log('[presence] setTyping:', isTyping, 'conv:', activeConvRef.current);
    channelRef.current.track({
      user_id: user.id,
      typing_in: isTyping ? activeConvRef.current : null,
    } as PresenceState);
    syncPresenceToDb({ typing_in: isTyping ? activeConvRef.current : null });

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        channelRef.current?.track({
          user_id: user.id,
          typing_in: null,
        } as PresenceState);
        syncPresenceToDb({ typing_in: null });
      }, 3000);
    }
  }, [user, syncPresenceToDb]);

  const setRecordingVn = useCallback((isRecording: boolean) => {
    if (!user || !channelRef.current) return;
    channelRef.current.track({
      user_id: user.id,
      recording_vn_in: isRecording ? activeConvRef.current : null,
    } as PresenceState);
    syncPresenceToDb({ recording_vn_in: isRecording ? activeConvRef.current : null });
  }, [user, syncPresenceToDb]);

  const setActiveConversation = useCallback((convId: string | null) => {
    activeConvRef.current = convId;
  }, []);

  const isOnline = useCallback((userId: string) => onlineUsers.has(userId), [onlineUsers]);
  const isTyping = useCallback((userId: string) => typingUsers.has(userId), [typingUsers]);
  const isRecordingVn = useCallback((userId: string) => recordingUsers.has(userId), [recordingUsers]);

  const getLastSeen = useCallback((userId: string) => {
    if (onlineUsers.has(userId)) return null;
    if (lastSeenCache[userId]) return lastSeenCache[userId];
    supabase.rpc('get_last_seen', { p_target_user_id: userId }).then(({ data, error }) => {
      if (data && !error) {
        setLastSeenCache(prev => ({ ...prev, [userId]: data }));
      }
    });
    return null;
  }, [onlineUsers, lastSeenCache]);

  return (
    <PresenceContext.Provider value={{ isOnline, isTyping, isRecordingVn, setTyping, setRecordingVn, setActiveConversation, getLastSeen }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresenceContext() {
  return useContext(PresenceContext);
}

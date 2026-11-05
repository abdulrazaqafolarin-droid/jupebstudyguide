import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { StudySessionData, StoredStudySession } from '@/types/syllabus';
import { deserializeProgress, serializeProgress } from '@/types/syllabus';
import { mergeStudySessions } from '@/lib/study-session-sync';

function isStoredStudySession(value: unknown): value is StoredStudySession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Record<string, unknown>;
  const progress = session.progress;
  if (!progress || typeof progress !== 'object') return false;
  const storedProgress = progress as Record<string, unknown>;

  return typeof session.id === 'string'
    && session.id.length > 0
    && typeof session.name === 'string'
    && Array.isArray(session.subjects)
    && ['active', 'paused', 'completed'].includes(String(session.status))
    && typeof session.createdAt === 'string'
    && typeof session.updatedAt === 'string'
    && typeof storedProgress.startedAt === 'string'
    && Array.isArray(storedProgress.dailyTasks)
    && typeof storedProgress.currentDay === 'number'
    && typeof storedProgress.overallProgress === 'number';
}

function hydrateSessions(raw: StoredStudySession[]): StudySessionData[] {
  return raw.map(session => ({
    ...session,
    progress: deserializeProgress(session.progress),
  }));
}

function dehydrateSessions(sessions: StudySessionData[]): StoredStudySession[] {
  return sessions.map(session => ({
    ...session,
    progress: serializeProgress(session.progress),
  }));
}

export function useStudySessionSync(
  sessions: StudySessionData[],
  setSessions: (updater: StudySessionData[] | ((prev: StudySessionData[]) => StudySessionData[])) => void,
  isLoaded: boolean,
) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const [readyUserId, setReadyUserId] = useState<string | null>(null);
  const lastSuccessfulHash = useRef<string>('');
  const pendingHash = useRef<string | null>(null);

  // Fetch before permitting writes. A failed read deliberately leaves sync
  // locked so a transient error cannot make an empty local array overwrite a
  // previously saved cloud record.
  useEffect(() => {
    if (!userId || !isLoaded) {
      setReadyUserId(null);
      return;
    }

    let active = true;
    setReadyUserId(null);

    const restoreAndMerge = async () => {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('sessions')
        .eq('user_id', userId)
        .maybeSingle();

      if (!active) return;
      if (error) {
        console.error('Could not restore study sessions; local data was retained.', error);
        return;
      }

      const raw = data?.sessions;
      if (data && !Array.isArray(raw)) {
        console.error('Cloud study-session record has an invalid shape; no overwrite was attempted.');
        return;
      }
      const storedCloudSessions = (raw ?? []) as unknown[];
      if (!storedCloudSessions.every(isStoredStudySession)) {
        console.error('Cloud study-session record contains invalid entries; no overwrite was attempted.');
        return;
      }

      try {
        const cloudSessions = hydrateSessions(storedCloudSessions as StoredStudySession[]);
        const merged = mergeStudySessions(sessionsRef.current, cloudSessions);
        if (JSON.stringify(merged) !== JSON.stringify(sessionsRef.current)) {
          setSessions(merged);
        }
        setReadyUserId(userId);
      } catch (err) {
        console.error('Could not safely merge cloud study sessions; local data was retained.', err);
      }
    };

    void restoreAndMerge();
    return () => {
      active = false;
    };
  }, [userId, isLoaded, setSessions]);

  // Only sync after the cloud read/merge succeeds. Hash the complete payload,
  // not only IDs/status, so edits to individual progress fields are detected.
  useEffect(() => {
    if (!userId || !isLoaded || readyUserId !== userId) return;

    const serialized = dehydrateSessions(sessions);
    const hash = `${userId}:${JSON.stringify(serialized)}`;
    if (hash === lastSuccessfulHash.current || hash === pendingHash.current) return;

    pendingHash.current = hash;
    const timeout = window.setTimeout(async () => {
      const { error } = await supabase
        .from('study_sessions')
        .upsert(
          { user_id: userId, sessions: serialized as unknown as import('@/integrations/supabase/types').Json },
          { onConflict: 'user_id' },
        );

      if (pendingHash.current === hash) pendingHash.current = null;
      if (error) {
        console.error('Study-session sync failed; local data remains available.', error);
        return;
      }
      lastSuccessfulHash.current = hash;
    }, 800);

    return () => {
      window.clearTimeout(timeout);
      if (pendingHash.current === hash) pendingHash.current = null;
    };
  }, [userId, isLoaded, readyUserId, sessions]);
}

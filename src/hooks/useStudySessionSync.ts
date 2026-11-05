import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { StudySessionData, StoredStudySession } from '@/types/syllabus';
import { deserializeProgress, serializeProgress } from '@/types/syllabus';
import { mergeStudySessions } from '@/lib/study-session-sync';

const VALID_SUBJECTS = ['physics', 'chemistry', 'biology', 'math'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isValidSubjectList(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.every(subject => typeof subject === 'string'
      && (VALID_SUBJECTS as readonly string[]).includes(subject));
}

function isValidStoredTask(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return Number.isInteger(value.day)
    && Number(value.day) > 0
    && typeof value.subject === 'string'
    && (VALID_SUBJECTS as readonly string[]).includes(value.subject)
    && Array.isArray(value.topics)
    && Array.isArray(value.learningObjectives)
    && Array.isArray(value.checkpointQuestions)
    && typeof value.isCompleted === 'boolean'
    && (value.completedAt === undefined
      || (typeof value.completedAt === 'string' && Number.isFinite(Date.parse(value.completedAt))))
    && (value.masteryScore === undefined
      || (typeof value.masteryScore === 'number' && Number.isFinite(value.masteryScore)));
}

function isStoredStudySession(value: unknown): value is StoredStudySession {
  if (!isRecord(value)) return false;
  const session = value;
  const progress = session.progress;
  if (!isRecord(progress)) return false;

  const combination = progress.combination;
  const subjectProgress = progress.subjectProgress;
  return typeof session.id === 'string'
    && session.id.length > 0
    && typeof session.name === 'string'
    && isValidSubjectList(session.subjects)
    && ['active', 'paused', 'completed'].includes(String(session.status))
    && typeof session.createdAt === 'string'
    && Number.isFinite(Date.parse(session.createdAt))
    && typeof session.updatedAt === 'string'
    && Number.isFinite(Date.parse(session.updatedAt))
    && typeof session.startDate === 'string'
    && Number.isFinite(Date.parse(session.startDate))
    && typeof session.dailyGoalMinutes === 'number'
    && Number.isFinite(session.dailyGoalMinutes)
    && Number(session.dailyGoalMinutes) > 0
    && typeof progress.startedAt === 'string'
    && Number.isFinite(Date.parse(progress.startedAt))
    && Array.isArray(progress.dailyTasks)
    && progress.dailyTasks.every(isValidStoredTask)
    && typeof progress.currentDay === 'number'
    && Number.isFinite(progress.currentDay)
    && typeof progress.overallProgress === 'number'
    && Number.isFinite(progress.overallProgress)
    && isRecord(combination)
    && isValidSubjectList(combination.core)
    && isValidSubjectList(combination.elective)
    && isRecord(subjectProgress)
    && Object.values(subjectProgress).every(item =>
      typeof item === 'number' && Number.isFinite(item));
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
  const [restoreAttempt, setRestoreAttempt] = useState(0);
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
  }, [userId, isLoaded, setSessions, restoreAttempt]);

  // If the first cloud read failed while offline, retry when connectivity
  // returns or the student brings the app back into the foreground. Once a
  // read succeeds, this listener is removed and no extra reads are triggered.
  useEffect(() => {
    if (!userId || !isLoaded || readyUserId === userId) return;

    const retryRestore = () => {
      if (navigator.onLine && document.visibilityState === 'visible') {
        setRestoreAttempt(attempt => attempt + 1);
      }
    };

    window.addEventListener('online', retryRestore);
    window.addEventListener('focus', retryRestore);
    document.addEventListener('visibilitychange', retryRestore);
    return () => {
      window.removeEventListener('online', retryRestore);
      window.removeEventListener('focus', retryRestore);
      document.removeEventListener('visibilitychange', retryRestore);
    };
  }, [userId, isLoaded, readyUserId]);

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

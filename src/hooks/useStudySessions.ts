import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { Subject } from '@/types/question';
import {
  StudySessionData,
  StoredStudySession,
  SyllabusProgress,
  DailyTask,
  SessionStatus,
  generateSessionTasks,
  serializeProgress,
  deserializeProgress,
  combinationFromSubjects,
  SYLLABUSES,
} from '@/types/syllabus';
import { useUserStorage } from './useUserStorage';
import { useAuth } from '@/contexts/AuthContext';
import { createLegacyStudySession } from '@/lib/legacy-syllabus-migration';

const STORAGE_KEY = 'study-sessions';
const OLD_STORAGE_KEY = 'syllabus-progress';
const MIGRATION_MARKER = 'study-sessions-legacy-migrated-v1';
const TOTAL_DAYS = 30;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function hydrateSession(stored: StoredStudySession): StudySessionData {
  return {
    ...stored,
    progress: deserializeProgress(stored.progress),
  };
}

function dehydrateSession(session: StudySessionData): StoredStudySession {
  return {
    ...session,
    progress: serializeProgress(session.progress),
  };
}

export function useStudySessions() {
  const [stored, setStored, { isReady: storageReady }] = useUserStorage<StoredStudySession[]>(STORAGE_KEY, []);
  const { user } = useAuth();
  const [migrationReadyUserId, setMigrationReadyUserId] = useState<string | null>(null);
  const migratedUserRef = useRef<string | null>(null);

  // Do the legacy local migration only after the current account's storage has
  // hydrated. Keep the original key as a recovery copy; do not delete it here.
  useEffect(() => {
    if (!user || !storageReady || migratedUserRef.current === user.id) return;

    migratedUserRef.current = user.id;
    const oldKey = `u:${user.id}:${OLD_STORAGE_KEY}`;
    const markerKey = `u:${user.id}:${MIGRATION_MARKER}`;

    try {
      const alreadyMigrated = localStorage.getItem(markerKey) === '1';
      if (alreadyMigrated) {
        setMigrationReadyUserId(user.id);
        return;
      }

      const oldRaw = localStorage.getItem(oldKey);
      if (!oldRaw) {
        // Do not write the marker when no legacy record exists. A later backup
        // import may restore this key, and the following app launch must still
        // be able to convert it into a multi-session record.
        setMigrationReadyUserId(user.id);
        return;
      }

      if (stored.length > 0) {
        // Current sessions already exist. Keep the old record intact rather
        // than replacing the current plan; a later explicit migration can
        // reconcile the two formats without losing either.
        setMigrationReadyUserId(user.id);
        return;
      }

      const legacySession = createLegacyStudySession(
        JSON.parse(oldRaw),
        generateId(),
        new Date().toISOString(),
      );
      if (!legacySession) {
        console.warn('Legacy syllabus data was retained but could not be converted safely.');
        setMigrationReadyUserId(user.id);
        return;
      }

      setStored([legacySession]);
      // Keep the source value as a recovery copy. The marker only records that
      // a valid destination session was generated.
      localStorage.setItem(markerKey, '1');
      setMigrationReadyUserId(user.id);
    } catch (err) {
      // Do not mark migration complete when reading/conversion/storage fails.
      migratedUserRef.current = null;
      console.error('Legacy syllabus migration failed; source data was retained.', err);
    }
  }, [user, storageReady, stored.length, setStored]);

  const isLoaded = Boolean(user && storageReady && migrationReadyUserId === user.id);

  const sessions: StudySessionData[] = useMemo(() => {
    if (!storageReady) return [];
    return stored.map(hydrateSession);
  }, [stored, storageReady]);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [sessions]);

  const activeSessions = useMemo(() => {
    return sortedSessions.filter(s => s.status === 'active');
  }, [sortedSessions]);

  const setSessions = useCallback(
    (updater: StudySessionData[] | ((prev: StudySessionData[]) => StudySessionData[])) => {
      setStored(prev => {
        const prevHydrated = prev.map(hydrateSession);
        const next = typeof updater === 'function' ? updater(prevHydrated) : updater;
        return next.map(s => dehydrateSession(s as StudySessionData));
      });
    },
    [setStored],
  );

  const createSession = useCallback(
    (name: string, subjects: Subject[], startDate: string, dailyGoalMinutes: number): StudySessionData => {
      const tasks = generateSessionTasks(subjects, TOTAL_DAYS);
      const initialProgress: Record<Subject, number> = {
        physics: 0,
        chemistry: 0,
        biology: 0,
        math: 0,
      };
      const now = new Date().toISOString();
      const progress: SyllabusProgress = {
        combination: combinationFromSubjects(subjects),
        currentDay: 1,
        dailyTasks: tasks,
        startedAt: new Date(startDate),
        overallProgress: 0,
        subjectProgress: initialProgress,
      };
      const session: StudySessionData = {
        id: generateId(),
        name,
        subjects,
        status: 'active',
        progress,
        startDate,
        dailyGoalMinutes,
        createdAt: now,
        updatedAt: now,
      };
      setSessions(prev => [...prev, session]);
      return session;
    },
    [setSessions],
  );

  const getSession = useCallback(
    (id: string): StudySessionData | undefined => sessions.find(s => s.id === id),
    [sessions],
  );

  const updateSession = useCallback(
    (id: string, updates: Partial<Pick<StudySessionData, 'name' | 'status' | 'dailyGoalMinutes'>>) => {
      setSessions(prev => prev.map(s =>
        s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
      ));
    },
    [setSessions],
  );

  const deleteSession = useCallback(
    (id: string) => setSessions(prev => prev.filter(s => s.id !== id)),
    [setSessions],
  );

  const completeDay = useCallback(
    (sessionId: string, day: number, masteryScore: number) => {
      setSessions(prev => prev.map(s => {
        if (s.id !== sessionId) return s;
        if (!Number.isFinite(masteryScore) || masteryScore < 70 || masteryScore > 100) return s;
        const updatedTasks = s.progress.dailyTasks.map(task =>
          task.day === day
            ? { ...task, isCompleted: true, completedAt: new Date(), masteryScore }
            : task
        );
        const completedCount = updatedTasks.filter(t => t.isCompleted).length;
        const overallProgress = (completedCount / updatedTasks.length) * 100;
        const subjectProgress = { ...s.progress.subjectProgress };
        const task = updatedTasks.find(t => t.day === day);
        if (task && task.topics.length > 0) {
          const totalTopics = (SYLLABUSES[task.subject] || []).length;
          const completedSubjectTasks = updatedTasks.filter(
            t => t.subject === task.subject && t.isCompleted && t.topics.length > 0
          ).length;
          if (totalTopics > 0) {
            subjectProgress[task.subject] = (completedSubjectTasks / totalTopics) * 100;
          }
        }
        const isAllDone = completedCount >= TOTAL_DAYS;
        return {
          ...s,
          status: isAllDone ? 'completed' as SessionStatus : s.status,
          updatedAt: new Date().toISOString(),
          progress: {
            ...s.progress,
            dailyTasks: updatedTasks,
            currentDay: Math.min(day + 1, TOTAL_DAYS),
            lastStudiedAt: new Date(),
            overallProgress,
            subjectProgress,
          },
        };
      }));
    },
    [setSessions],
  );

  const canAdvanceToDay = useCallback(
    (sessionId: string, day: number): boolean => {
      const session = sessions.find(s => s.id === sessionId);
      if (!session || day <= 1) return true;
      const prevTask = session.progress.dailyTasks.find(t => t.day === day - 1);
      return Boolean(prevTask?.isCompleted) && (prevTask?.masteryScore ?? 0) >= 70;
    },
    [sessions],
  );

  const renameSession = useCallback((id: string, newName: string) => updateSession(id, { name: newName }), [updateSession]);
  const pauseSession = useCallback((id: string) => updateSession(id, { status: 'paused' }), [updateSession]);
  const resumeSession = useCallback((id: string) => updateSession(id, { status: 'active' }), [updateSession]);

  return {
    sessions: sortedSessions,
    activeSessions,
    createSession,
    getSession,
    updateSession,
    deleteSession,
    completeDay,
    canAdvanceToDay,
    renameSession,
    pauseSession,
    resumeSession,
    setSessions,
    isLoaded,
  };
}

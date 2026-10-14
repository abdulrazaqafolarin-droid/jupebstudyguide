import { useCallback, useMemo, useRef, useEffect } from 'react';
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

const STORAGE_KEY = 'study-sessions';
const OLD_STORAGE_KEY = 'syllabus-progress';
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
  const [stored, setStored] = useUserStorage<StoredStudySession[]>(STORAGE_KEY, []);
  const { user } = useAuth();
  const migratedRef = useRef(false);

  // Migrate old single-session data to multi-session format on first load
  useEffect(() => {
    if (migratedRef.current || !user) return;
    migratedRef.current = true;

    // Only migrate if we have no sessions yet
    if (stored.length > 0) return;

    const oldKey = `u:${user.id}:${OLD_STORAGE_KEY}`;
    const oldRaw = localStorage.getItem(oldKey);
    if (!oldRaw) return;

    try {
      const oldData = JSON.parse(oldRaw);
      if (!oldData || !oldData.dailyTasks) return;

      const subjects: Subject[] = [];
      if (oldData.combination?.core) {
        for (const s of oldData.combination.core) {
          if (!subjects.includes(s)) subjects.push(s);
        }
      }
      if (oldData.combination?.elective) {
        for (const s of oldData.combination.elective) {
          if (!subjects.includes(s)) subjects.push(s);
        }
      }
      if (subjects.length === 0) {
        subjects.push('physics', 'chemistry');
      }

      const now = new Date().toISOString();
      const session: StoredStudySession = {
        id: generateId(),
        name: subjects.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' + ') + ' Plan',
        subjects,
        status: oldData.currentDay > 30 ? 'completed' : 'active',
        progress: oldData,
        startDate: oldData.startedAt?.split('T')[0] || now.split('T')[0],
        dailyGoalMinutes: 30,
        createdAt: oldData.startedAt || now,
        updatedAt: now,
      };

      setStored([session]);
      localStorage.removeItem(oldKey);
    } catch {
      // Migration failed silently
    }
  }, [user, stored.length, setStored]);

  const sessions: StudySessionData[] = useMemo(() => {
    return stored.map(hydrateSession);
  }, [stored]);

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
    (id: string): StudySessionData | undefined => {
      return sessions.find(s => s.id === id);
    },
    [sessions],
  );

  const updateSession = useCallback(
    (id: string, updates: Partial<Pick<StudySessionData, 'name' | 'status' | 'dailyGoalMinutes'>>) => {
      setSessions(prev => prev.map(s =>
        s.id === id
          ? { ...s, ...updates, updatedAt: new Date().toISOString() }
          : s
      ));
    },
    [setSessions],
  );

  const deleteSession = useCallback(
    (id: string) => {
      setSessions(prev => prev.filter(s => s.id !== id));
    },
    [setSessions],
  );

  const completeDay = useCallback(
    (sessionId: string, day: number, masteryScore: number) => {
      setSessions(prev => prev.map(s => {
        if (s.id !== sessionId) return s;
        // A day is not complete until the learner reaches the required threshold.
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

  const renameSession = useCallback(
    (id: string, newName: string) => {
      updateSession(id, { name: newName });
    },
    [updateSession],
  );

  const pauseSession = useCallback(
    (id: string) => {
      updateSession(id, { status: 'paused' });
    },
    [updateSession],
  );

  const resumeSession = useCallback(
    (id: string) => {
      updateSession(id, { status: 'active' });
    },
    [updateSession],
  );

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
  };
}

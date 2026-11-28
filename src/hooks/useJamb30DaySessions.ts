import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useUserStorage } from "@/hooks/useUserStorage";
import {
  generateJamb30DayTasks,
  isJambStudySession,
  mergeJambStudySessions,
  reorderJambStudySessionSubjects,
  type JambPlanSubject,
  type JambStudySession,
} from "@/lib/jamb-30-day-syllabus";

const STORAGE_KEY = "jamb-30-day-study-sessions-v1";
const TOTAL_DAYS = 30;

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * JAMB's 30-day plans are deliberately isolated from JUPEB's study_sessions
 * payload and legacy syllabus-progress key. They sync through the JAMB-only
 * exam_user_study_sessions row and remain locally available while offline.
 */
export function useJamb30DaySessions() {
  const { user, loading: authLoading } = useAuth();
  const [stored, setStored, { isReady: storageReady }] = useUserStorage<JambStudySession[]>(
    STORAGE_KEY,
    [],
  );
  const [readyUserId, setReadyUserId] = useState<string | null>(null);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const sessionsRef = useRef(stored);
  const lastSuccessfulHash = useRef("");

  useEffect(() => {
    sessionsRef.current = stored;
  }, [stored]);

  useEffect(() => {
    if (authLoading || !user?.id || !storageReady) {
      setReadyUserId(null);
      return;
    }

    let active = true;
    setReadyUserId(null);

    const restoreAndMerge = async () => {
      const { data, error } = await supabase
        .from("exam_user_study_sessions")
        .select("sessions")
        .eq("user_id", user.id)
        .eq("exam_program_id", "jamb")
        .maybeSingle();

      if (!active) return;
      if (error) {
        console.warn("[JAMB 30-day syllabus] Cloud restore failed; local data is retained:", error.message);
        return;
      }

      const raw = data?.sessions;
      if (data && !Array.isArray(raw)) {
        console.error("[JAMB 30-day syllabus] Cloud session payload is not an array; no overwrite was attempted.");
        return;
      }
      const cloudSessions = (raw ?? []) as unknown[];
      if (!cloudSessions.every(isJambStudySession)) {
        console.error("[JAMB 30-day syllabus] Cloud session payload failed validation; no overwrite was attempted.");
        return;
      }

      const merged = mergeJambStudySessions(sessionsRef.current, cloudSessions);
      sessionsRef.current = merged;
      setStored(merged);
      lastSuccessfulHash.current = `${user.id}:${JSON.stringify(cloudSessions)}`;
      setReadyUserId(user.id);
    };

    void restoreAndMerge();
    return () => {
      active = false;
    };
  }, [user?.id, authLoading, storageReady, restoreAttempt, setStored]);

  useEffect(() => {
    if (!user?.id || !storageReady || readyUserId === user.id) return;
    const retryRestore = () => {
      if (navigator.onLine && document.visibilityState === "visible") {
        setRestoreAttempt((attempt) => attempt + 1);
      }
    };
    window.addEventListener("online", retryRestore);
    window.addEventListener("focus", retryRestore);
    document.addEventListener("visibilitychange", retryRestore);
    return () => {
      window.removeEventListener("online", retryRestore);
      window.removeEventListener("focus", retryRestore);
      document.removeEventListener("visibilitychange", retryRestore);
    };
  }, [user?.id, storageReady, readyUserId]);

  const sessions = useMemo(
    () => [...stored].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [stored],
  );

  useEffect(() => {
    if (!user?.id || !storageReady || readyUserId !== user.id) return;
    const payload = sessions;
    const hash = `${user.id}:${JSON.stringify(payload)}`;
    if (hash === lastSuccessfulHash.current) return;

    const timeout = window.setTimeout(async () => {
      const { error } = await supabase
        .from("exam_user_study_sessions")
        .upsert(
          {
            user_id: user.id,
            exam_program_id: "jamb",
            sessions: payload as unknown as Json,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,exam_program_id" },
        );
      if (error) {
        console.warn("[JAMB 30-day syllabus] Cloud sync failed; local progress remains available:", error.message);
        return;
      }
      lastSuccessfulHash.current = hash;
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [user?.id, storageReady, readyUserId, sessions]);

  const createSession = useCallback((
    name: string,
    subjects: JambPlanSubject[],
    startDate: string,
    dailyGoalMinutes: number,
  ): JambStudySession => {
    const now = new Date().toISOString();
    const normalizedSubjects = [...new Set(subjects)];
    const initialSubjectProgress = {
      use_of_english: 0,
      physics: 0,
      chemistry: 0,
      biology: 0,
      math: 0,
    };
    const session: JambStudySession = {
      id: createId(),
      name,
      subjects: normalizedSubjects,
      status: "active",
      startDate,
      dailyGoalMinutes,
      createdAt: now,
      updatedAt: now,
      progress: {
        subjects: normalizedSubjects,
        currentDay: 1,
        dailyTasks: generateJamb30DayTasks(normalizedSubjects),
        startedAt: new Date(`${startDate}T00:00:00`).toISOString(),
        overallProgress: 0,
        subjectProgress: initialSubjectProgress,
      },
    };
    setStored((previous) => [session, ...previous]);
    return session;
  }, [setStored]);

  const updateSession = useCallback((
    id: string,
    updates: Partial<Pick<JambStudySession, "name" | "status" | "dailyGoalMinutes">>,
  ) => {
    const updatedAt = new Date().toISOString();
    setStored((previous) => previous.map((session) =>
      session.id === id ? { ...session, ...updates, updatedAt } : session,
    ));
  }, [setStored]);

  const deleteSession = useCallback((id: string) => {
    setStored((previous) => previous.filter((session) => session.id !== id));
  }, [setStored]);

  const completeDay = useCallback((sessionId: string, day: number, masteryScore: number) => {
    if (!Number.isFinite(masteryScore) || masteryScore < 70 || masteryScore > 100) return;
    const now = new Date().toISOString();
    setStored((previous) => previous.map((session) => {
      if (session.id !== sessionId) return session;
      const existingTask = session.progress.dailyTasks.find((task) => task.day === day);
      if (!existingTask || day > session.progress.currentDay || day < 1) return session;
      const updatedTasks = session.progress.dailyTasks.map((task) =>
        task.day === day
          ? { ...task, isCompleted: true, completedAt: now, masteryScore }
          : task,
      );
      const completedCount = updatedTasks.filter((task) => task.isCompleted).length;
      const isComplete = completedCount >= TOTAL_DAYS;
      const subjectProgress = { ...session.progress.subjectProgress };
      const task = updatedTasks.find((item) => item.day === day);
      if (task) {
        for (const subject of session.subjects) {
          const subjectTopics = session.progress.dailyTasks.flatMap((item) =>
            item.topics.filter((topic) => topic.subject === subject),
          );
          const completedTopicIds = new Set(updatedTasks
            .filter((item) => item.isCompleted)
            .flatMap((item) => item.topics.filter((topic) => topic.subject === subject).map((topic) => topic.id)));
          if (subjectTopics.length > 0) {
            subjectProgress[subject] = (completedTopicIds.size / subjectTopics.length) * 100;
          }
        }
      }
      return {
        ...session,
        status: isComplete ? "completed" : session.status,
        updatedAt: now,
        progress: {
          ...session.progress,
          dailyTasks: updatedTasks,
          currentDay: Math.min(day + 1, TOTAL_DAYS),
          lastStudiedAt: now,
          overallProgress: (completedCount / TOTAL_DAYS) * 100,
          subjectProgress,
        },
      };
    }));
  }, [setStored]);

  const reorderSubjects = useCallback((sessionId: string, orderedSubjects: JambPlanSubject[]) => {
    setStored((previous) => previous.map((session) =>
      session.id === sessionId
        ? reorderJambStudySessionSubjects(session, orderedSubjects)
        : session,
    ));
  }, [setStored]);

  const canAdvanceToDay = useCallback((sessionId: string, day: number) => {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session || day < 1 || day > TOTAL_DAYS) return false;
    if (day === 1) return true;
    const previous = session.progress.dailyTasks.find((task) => task.day === day - 1);
    return Boolean(previous?.isCompleted) && (previous?.masteryScore ?? 0) >= 70;
  }, [sessions]);

  const renameSession = useCallback((id: string, name: string) => updateSession(id, { name }), [updateSession]);
  const pauseSession = useCallback((id: string) => updateSession(id, { status: "paused" }), [updateSession]);
  const resumeSession = useCallback((id: string) => updateSession(id, { status: "active" }), [updateSession]);

  return {
    sessions,
    createSession,
    updateSession,
    deleteSession,
    completeDay,
    canAdvanceToDay,
    reorderSubjects,
    renameSession,
    pauseSession,
    resumeSession,
    isLoaded: Boolean(!authLoading && storageReady),
  };
}

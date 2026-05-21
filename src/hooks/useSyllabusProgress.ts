import { useCallback, useMemo } from 'react';
import { Subject } from '@/types/question';
import {
  SyllabusProgress,
  DailyTask,
  SyllabusTopic,
  UserSubjectCombination,
  SYLLABUSES,
} from '@/types/syllabus';
import { useUserStorage } from './useUserStorage';

const STORAGE_KEY = 'syllabus-progress';

function generateDailyTasks(
  combination: UserSubjectCombination,
  totalDays: number = 30
): DailyTask[] {
  const tasks: DailyTask[] = [];
  const allSubjects: Subject[] = [...combination.core, ...combination.elective];
  
  // Collect all topics from selected subjects
  const allTopics: { topic: SyllabusTopic; subject: Subject }[] = [];
  for (const subject of allSubjects) {
    const syllabus = SYLLABUSES[subject];
    for (const topic of syllabus) {
      allTopics.push({ topic, subject });
    }
  }
  
  // Distribute topics across days
  const topicsPerDay = Math.ceil(allTopics.length / totalDays);
  let topicIndex = 0;
  
  for (let day = 1; day <= totalDays; day++) {
    const dayTopics: SyllabusTopic[] = [];
    let daySubject: Subject = allSubjects[0];
    const objectives: string[] = [];
    const checkpoints: string[] = [];
    
    // Assign topics for this day
    for (let i = 0; i < topicsPerDay && topicIndex < allTopics.length; i++) {
      const { topic, subject } = allTopics[topicIndex];
      dayTopics.push(topic);
      daySubject = subject;
      
      // Generate learning objectives
      objectives.push(`Understand the key concepts of ${topic.name}`);
      topic.subtopics.slice(0, 2).forEach(sub => {
        objectives.push(`Master ${sub}`);
      });
      
      // Generate checkpoint questions
      checkpoints.push(`Can you explain ${topic.name} in your own words?`);
      checkpoints.push(`What are the key formulas/concepts in ${topic.subtopics[0] || 'this topic'}?`);
      
      topicIndex++;
    }
    
    if (dayTopics.length > 0) {
      tasks.push({
        day,
        topics: dayTopics,
        subject: daySubject,
        learningObjectives: objectives,
        checkpointQuestions: checkpoints,
        isCompleted: false,
      });
    }
  }
  
  // Fill remaining days with review/practice
  while (tasks.length < totalDays) {
    const reviewDay = tasks.length + 1;
    const reviewSubject = allSubjects[reviewDay % allSubjects.length];
    
    tasks.push({
      day: reviewDay,
      topics: [],
      subject: reviewSubject,
      learningObjectives: ['Review previous topics', 'Practice past questions', 'Strengthen weak areas'],
      checkpointQuestions: ['Can you solve problems from the topics covered this week?'],
      isCompleted: false,
    });
  }
  
  return tasks;
}

type StoredSyllabus = Omit<SyllabusProgress, 'startedAt' | 'lastStudiedAt'> & {
  startedAt: string;
  lastStudiedAt?: string;
};

export function useSyllabusProgress() {
  const [stored, setStored, { reset: resetStorage }] = useUserStorage<StoredSyllabus | null>(
    STORAGE_KEY,
    null,
  );

  const progress: SyllabusProgress | null = useMemo(() => {
    if (!stored) return null;
    return {
      ...stored,
      startedAt: new Date(stored.startedAt),
      lastStudiedAt: stored.lastStudiedAt ? new Date(stored.lastStudiedAt) : undefined,
    };
  }, [stored]);

  const setProgress = useCallback(
    (updater: SyllabusProgress | null | ((prev: SyllabusProgress | null) => SyllabusProgress | null)) => {
      setStored(prev => {
        const prevHydrated: SyllabusProgress | null = prev
          ? {
              ...prev,
              startedAt: new Date(prev.startedAt),
              lastStudiedAt: prev.lastStudiedAt ? new Date(prev.lastStudiedAt) : undefined,
            }
          : null;
        const next = typeof updater === 'function' ? updater(prevHydrated as SyllabusProgress | null) : updater;
        if (!next) return null;
        return {
          ...next,
          startedAt: next.startedAt.toISOString(),
          lastStudiedAt: next.lastStudiedAt ? next.lastStudiedAt.toISOString() : undefined,
        };
      });
    },
    [setStored],
  );

  const startSyllabus = useCallback((combination: UserSubjectCombination) => {
    const dailyTasks = generateDailyTasks(combination);
    
    const initialProgress: Record<Subject, number> = {
      physics: 0,
      chemistry: 0,
      biology: 0,
      math: 0,
    };
    
    const newProgress: SyllabusProgress = {
      combination,
      currentDay: 1,
      dailyTasks,
      startedAt: new Date(),
      overallProgress: 0,
      subjectProgress: initialProgress,
    };
    
    setProgress(newProgress);
    return newProgress;
  }, []);

  const completeDay = useCallback((day: number, masteryScore: number) => {
    setProgress(prev => {
      if (!prev) return null;
      
      const updatedTasks = prev.dailyTasks.map(task =>
        task.day === day
          ? { ...task, isCompleted: true, completedAt: new Date(), masteryScore }
          : task
      );
      
      const completedCount = updatedTasks.filter(t => t.isCompleted).length;
      const overallProgress = (completedCount / updatedTasks.length) * 100;
      
      // Calculate per-subject progress
      const subjectProgress = { ...prev.subjectProgress };
      const task = updatedTasks.find(t => t.day === day);
      if (task && task.topics.length > 0) {
        const totalTopics = SYLLABUSES[task.subject].length;
        const completedSubjectTasks = updatedTasks.filter(
          t => t.subject === task.subject && t.isCompleted && t.topics.length > 0
        ).length;
        subjectProgress[task.subject] = (completedSubjectTasks / totalTopics) * 100;
      }
      
      return {
        ...prev,
        dailyTasks: updatedTasks,
        currentDay: Math.min(day + 1, prev.dailyTasks.length),
        lastStudiedAt: new Date(),
        overallProgress,
        subjectProgress,
      };
    });
  }, []);

  const getCurrentTask = useCallback((): DailyTask | null => {
    if (!progress) return null;
    return progress.dailyTasks.find(t => t.day === progress.currentDay) || null;
  }, [progress]);

  const getTaskForDay = useCallback((day: number): DailyTask | null => {
    if (!progress) return null;
    return progress.dailyTasks.find(t => t.day === day) || null;
  }, [progress]);

  const canAdvanceToDay = useCallback((day: number): boolean => {
    if (!progress || day <= 1) return true;
    const prevTask = progress.dailyTasks.find(t => t.day === day - 1);
    return Boolean(prevTask?.isCompleted) && (prevTask?.masteryScore ?? 0) >= 70;
  }, [progress]);

  const resetProgress = useCallback(() => {
    resetStorage();
  }, [resetStorage]);

  /**
   * Reorder subjects mid-journey: rebuild remaining (non-locked) days using
   * the new subject order while preserving completed days and the 30-day total.
   */
  const reorderSubjects = useCallback((orderedSubjects: Subject[]) => {
    setProgress(prev => {
      if (!prev) return null;
      const total = prev.dailyTasks.length || 30;

      // Locked = completed OR before currentDay (already started/finished)
      const locked = prev.dailyTasks.filter(t => t.isCompleted || t.day < prev.currentDay);
      const lockedDays = new Set(locked.map(t => t.day));
      const coveredTopicIds = new Set(locked.flatMap(t => t.topics.map(tp => tp.id)));

      // Build pool of uncovered topics following new subject order
      const allowed = new Set<Subject>([...prev.combination.core, ...prev.combination.elective]);
      const subjectOrder = orderedSubjects.filter(s => allowed.has(s));
      // Append any allowed subjects missing from order (safety)
      for (const s of allowed) if (!subjectOrder.includes(s)) subjectOrder.push(s);

      const pool: { topic: SyllabusTopic; subject: Subject }[] = [];
      for (const subject of subjectOrder) {
        for (const topic of SYLLABUSES[subject]) {
          if (!coveredTopicIds.has(topic.id)) pool.push({ topic, subject });
        }
      }

      // Remaining day slots
      const remainingDays: number[] = [];
      for (let d = 1; d <= total; d++) if (!lockedDays.has(d)) remainingDays.push(d);

      const perDay = Math.max(1, Math.ceil(pool.length / Math.max(1, remainingDays.length)));
      const newRemaining: DailyTask[] = [];
      let idx = 0;
      for (const day of remainingDays) {
        const dayTopics: SyllabusTopic[] = [];
        let daySubject: Subject = subjectOrder[0];
        const objectives: string[] = [];
        const checkpoints: string[] = [];
        for (let i = 0; i < perDay && idx < pool.length; i++) {
          const { topic, subject } = pool[idx++];
          dayTopics.push(topic);
          daySubject = subject;
          objectives.push(`Understand the key concepts of ${topic.name}`);
          topic.subtopics.slice(0, 2).forEach(sub => objectives.push(`Master ${sub}`));
          checkpoints.push(`Can you explain ${topic.name} in your own words?`);
          if (topic.subtopics[0]) checkpoints.push(`What are the key formulas/concepts in ${topic.subtopics[0]}?`);
        }
        if (dayTopics.length === 0) {
          newRemaining.push({
            day,
            topics: [],
            subject: daySubject,
            learningObjectives: ['Review previous topics', 'Practice past questions', 'Strengthen weak areas'],
            checkpointQuestions: ['Can you solve problems from the topics covered this week?'],
            isCompleted: false,
          });
        } else {
          newRemaining.push({
            day,
            topics: dayTopics,
            subject: daySubject,
            learningObjectives: objectives,
            checkpointQuestions: checkpoints,
            isCompleted: false,
          });
        }
      }

      const merged = [...locked, ...newRemaining].sort((a, b) => a.day - b.day);
      return { ...prev, dailyTasks: merged };
    });
  }, [setProgress]);

  return {
    progress,
    startSyllabus,
    completeDay,
    getCurrentTask,
    getTaskForDay,
    canAdvanceToDay,
    resetProgress,
    reorderSubjects,
    isStarted: progress !== null,
  };
}

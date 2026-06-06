import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useUserStorage } from './useUserStorage';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: AchievementStats) => boolean;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  getProgress?: (stats: AchievementStats) => { current: number; max: number } | null;
}

export interface AchievementStats {
  totalQuestionsAnswered: number;
  totalCorrect: number;
  currentStreak: number;
  longestStreak: number;
  totalDaysStudied: number;
  questionsLearned: number;
  subjectsStudied: number;
  documentsUploaded?: number;
  syllabusProgress?: number;
  syllabusCompleted?: boolean;
  studiedAfterMidnight?: boolean;
  studiedBefore6am?: boolean;
  consecutiveCorrect?: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_day',
    name: 'First Step',
    description: 'Complete your first study session',
    icon: '🌱',
    condition: (s) => s.totalDaysStudied >= 1,
    rarity: 'common',
    getProgress: (s) => ({ current: Math.min(s.totalDaysStudied, 1), max: 1 }),
  },
  {
    id: 'streak_3',
    name: 'Getting Consistent',
    description: 'Maintain a 3-day study streak',
    icon: '🔥',
    condition: (s) => s.longestStreak >= 3,
    rarity: 'common',
    getProgress: (s) => ({ current: Math.min(s.longestStreak, 3), max: 3 }),
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day study streak',
    icon: '💪',
    condition: (s) => s.longestStreak >= 7,
    rarity: 'uncommon',
    getProgress: (s) => ({ current: Math.min(s.longestStreak, 7), max: 7 }),
  },
  {
    id: 'streak_14',
    name: 'Fortnight Fighter',
    description: 'Maintain a 14-day study streak',
    icon: '⚔️',
    condition: (s) => s.longestStreak >= 14,
    rarity: 'epic',
    getProgress: (s) => ({ current: Math.min(s.longestStreak, 14), max: 14 }),
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day study streak',
    icon: '👑',
    condition: (s) => s.longestStreak >= 30,
    rarity: 'legendary',
    getProgress: (s) => ({ current: Math.min(s.longestStreak, 30), max: 30 }),
  },

  {
    id: 'first_10',
    name: 'Getting Started',
    description: 'Answer 10 questions',
    icon: '📚',
    condition: (s) => s.totalQuestionsAnswered >= 10,
    rarity: 'common',
    getProgress: (s) => ({ current: Math.min(s.totalQuestionsAnswered, 10), max: 10 }),
  },
  {
    id: 'first_50',
    name: 'Dedicated Learner',
    description: 'Answer 50 questions',
    icon: '📖',
    condition: (s) => s.totalQuestionsAnswered >= 50,
    rarity: 'uncommon',
    getProgress: (s) => ({ current: Math.min(s.totalQuestionsAnswered, 50), max: 50 }),
  },
  {
    id: 'first_100',
    name: 'Century Club',
    description: 'Answer 100 questions',
    icon: '💯',
    condition: (s) => s.totalQuestionsAnswered >= 100,
    rarity: 'uncommon',
    getProgress: (s) => ({ current: Math.min(s.totalQuestionsAnswered, 100), max: 100 }),
  },
  {
    id: 'first_500',
    name: 'Knowledge Seeker',
    description: 'Answer 500 questions',
    icon: '🎓',
    condition: (s) => s.totalQuestionsAnswered >= 500,
    rarity: 'epic',
    getProgress: (s) => ({ current: Math.min(s.totalQuestionsAnswered, 500), max: 500 }),
  },
  {
    id: 'first_1000',
    name: 'Question Master',
    description: 'Answer 1000 questions',
    icon: '🏅',
    condition: (s) => s.totalQuestionsAnswered >= 1000,
    rarity: 'legendary',
    getProgress: (s) => ({ current: Math.min(s.totalQuestionsAnswered, 1000), max: 1000 }),
  },

  {
    id: 'master_10',
    name: 'First Mastery',
    description: 'Master 10 questions',
    icon: '✨',
    condition: (s) => s.questionsLearned >= 10,
    rarity: 'common',
    getProgress: (s) => ({ current: Math.min(s.questionsLearned, 10), max: 10 }),
  },
  {
    id: 'master_50',
    name: 'Rising Scholar',
    description: 'Master 50 questions',
    icon: '🌟',
    condition: (s) => s.questionsLearned >= 50,
    rarity: 'uncommon',
    getProgress: (s) => ({ current: Math.min(s.questionsLearned, 50), max: 50 }),
  },
  {
    id: 'master_100',
    name: 'Expert Level',
    description: 'Master 100 questions',
    icon: '🏆',
    condition: (s) => s.questionsLearned >= 100,
    rarity: 'epic',
    getProgress: (s) => ({ current: Math.min(s.questionsLearned, 100), max: 100 }),
  },
  {
    id: 'master_200',
    name: 'Grandmaster',
    description: 'Master 200 questions',
    icon: '💎',
    condition: (s) => s.questionsLearned >= 200,
    rarity: 'legendary',
    getProgress: (s) => ({ current: Math.min(s.questionsLearned, 200), max: 200 }),
  },

  {
    id: 'accuracy_high',
    name: 'Sharp Mind',
    description: 'Get 80% accuracy over 50+ questions',
    icon: '🎯',
    condition: (s) => s.totalQuestionsAnswered >= 50 && (s.totalCorrect / s.totalQuestionsAnswered) >= 0.8,
    rarity: 'uncommon',
    getProgress: (s) => ({ current: Math.min(s.totalQuestionsAnswered, 50), max: 50 }),
  },
  {
    id: 'accuracy_perfect',
    name: 'Perfectionist',
    description: 'Get 90% accuracy over 100+ questions',
    icon: '💫',
    condition: (s) => s.totalQuestionsAnswered >= 100 && (s.totalCorrect / s.totalQuestionsAnswered) >= 0.9,
    rarity: 'epic',
    getProgress: (s) => ({ current: Math.min(s.totalQuestionsAnswered, 100), max: 100 }),
  },
  {
    id: 'perfect_10',
    name: 'Perfect Ten',
    description: 'Get 10 correct answers in a row',
    icon: '🔟',
    condition: (s) => (s.consecutiveCorrect ?? 0) >= 10,
    rarity: 'uncommon',
    getProgress: (s) => ({ current: Math.min(s.consecutiveCorrect ?? 0, 10), max: 10 }),
  },

  {
    id: 'all_subjects',
    name: 'Well Rounded',
    description: 'Study all three subjects',
    icon: '🌈',
    condition: (s) => s.subjectsStudied >= 3,
    rarity: 'common',
    getProgress: (s) => ({ current: Math.min(s.subjectsStudied, 3), max: 3 }),
  },
  {
    id: 'four_subjects',
    name: 'Renaissance Student',
    description: 'Study all four subjects',
    icon: '🎨',
    condition: (s) => s.subjectsStudied >= 4,
    rarity: 'uncommon',
    getProgress: (s) => ({ current: Math.min(s.subjectsStudied, 4), max: 4 }),
  },

  {
    id: 'first_upload',
    name: 'Content Creator',
    description: 'Upload your first document',
    icon: '📤',
    condition: (s) => (s.documentsUploaded ?? 0) >= 1,
    rarity: 'common',
    getProgress: (s) => ({ current: Math.min(s.documentsUploaded ?? 0, 1), max: 1 }),
  },
  {
    id: 'upload_5',
    name: 'Resource Builder',
    description: 'Upload 5 documents',
    icon: '📂',
    condition: (s) => (s.documentsUploaded ?? 0) >= 5,
    rarity: 'uncommon',
    getProgress: (s) => ({ current: Math.min(s.documentsUploaded ?? 0, 5), max: 5 }),
  },
  {
    id: 'upload_10',
    name: 'Archive Master',
    description: 'Upload 10 documents',
    icon: '🗃️',
    condition: (s) => (s.documentsUploaded ?? 0) >= 10,
    rarity: 'epic',
    getProgress: (s) => ({ current: Math.min(s.documentsUploaded ?? 0, 10), max: 10 }),
  },

  {
    id: 'syllabus_start',
    name: 'Journey Begins',
    description: 'Start the 30-day syllabus',
    icon: '🚀',
    condition: (s) => (s.syllabusProgress ?? 0) > 0,
    rarity: 'common',
    getProgress: (s) => ({ current: Math.min(s.syllabusProgress ?? 0, 1), max: 1 }),
  },
  {
    id: 'syllabus_week1',
    name: 'Week One Done',
    description: 'Complete 7 days of the syllabus',
    icon: '📆',
    condition: (s) => (s.syllabusProgress ?? 0) >= 7,
    rarity: 'common',
    getProgress: (s) => ({ current: Math.min(s.syllabusProgress ?? 0, 7), max: 7 }),
  },
  {
    id: 'syllabus_half',
    name: 'Halfway There',
    description: 'Complete 15 days of the syllabus',
    icon: '⏳',
    condition: (s) => (s.syllabusProgress ?? 0) >= 15,
    rarity: 'uncommon',
    getProgress: (s) => ({ current: Math.min(s.syllabusProgress ?? 0, 15), max: 15 }),
  },
  {
    id: 'syllabus_25',
    name: 'Final Push',
    description: 'Complete 25 days of the syllabus',
    icon: '🎢',
    condition: (s) => (s.syllabusProgress ?? 0) >= 25,
    rarity: 'epic',
    getProgress: (s) => ({ current: Math.min(s.syllabusProgress ?? 0, 25), max: 25 }),
  },
  {
    id: 'syllabus_complete',
    name: 'Syllabus Champion',
    description: 'Complete the entire 30-day syllabus',
    icon: '🏆',
    condition: (s) => s.syllabusCompleted === true,
    rarity: 'legendary',
    getProgress: (s) => ({ current: Math.min(s.syllabusProgress ?? 0, 30), max: 30 }),
  },

  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Study after midnight',
    icon: '🦉',
    condition: (s) => s.studiedAfterMidnight === true,
    rarity: 'uncommon',
    getProgress: (s) => ({ current: s.studiedAfterMidnight ? 1 : 0, max: 1 }),
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Study before 6 AM',
    icon: '🐦',
    condition: (s) => s.studiedBefore6am === true,
    rarity: 'uncommon',
    getProgress: (s) => ({ current: s.studiedBefore6am ? 1 : 0, max: 1 }),
  },
];

const UNLOCKED_KEY = 'achievements-unlocked';

export function useAchievements(
  stats: AchievementStats,
  onNewUnlock?: (achievement: Achievement) => void,
  initialUnlockedIds?: string[],
) {
  const [unlockedArr, setUnlockedArr] = useUserStorage<string[]>(UNLOCKED_KEY, []);
  const unlockedIds = useMemo(() => new Set(unlockedArr), [unlockedArr]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([]);
  const prevUnlockCount = useRef(unlockedIds.size);

  // Merge DB achievements into localStorage on mount (cross-device sync fix)
  useEffect(() => {
    if (!initialUnlockedIds || initialUnlockedIds.length === 0) return;
    const current = new Set(unlockedArr);
    let changed = false;
    for (const id of initialUnlockedIds) {
      if (!current.has(id)) {
        current.add(id);
        changed = true;
      }
    }
    if (changed) {
      setUnlockedArr([...current]);
    }
  }, [initialUnlockedIds]);

  const statsKey = useMemo(() => JSON.stringify(stats), [stats]);

  useEffect(() => {
    const newUnlocks: Achievement[] = [];
    ACHIEVEMENTS.forEach(achievement => {
      if (!unlockedIds.has(achievement.id) && achievement.condition(stats)) {
        newUnlocks.push(achievement);
      }
    });

    if (newUnlocks.length > 0) {
      const next = new Set(unlockedIds);
      newUnlocks.forEach(a => next.add(a.id));
      setUnlockedArr([...next]);
      setNewlyUnlocked(prev => [...prev, ...newUnlocks]);

      newUnlocks.forEach(a => onNewUnlock?.(a));
    }
  }, [statsKey]);

  const clearNewlyUnlocked = useCallback(() => {
    setNewlyUnlocked([]);
  }, []);

  // Sync new unlocks to onNewUnlock callback even when they come from
  // newlyUnlocked state (e.g., from previous renders before callback was set up)
  useEffect(() => {
    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach(a => onNewUnlock?.(a));
    }
  }, [newlyUnlocked.length]);

  const unlockedAchievements = useMemo(
    () => ACHIEVEMENTS.filter(a => unlockedIds.has(a.id)),
    [unlockedIds],
  );

  const lockedAchievements = useMemo(
    () => ACHIEVEMENTS.filter(a => !unlockedIds.has(a.id)),
    [unlockedIds],
  );

  return {
    achievements: ACHIEVEMENTS,
    unlockedAchievements,
    lockedAchievements,
    newlyUnlocked,
    clearNewlyUnlocked,
    unlockedCount: unlockedIds.size,
    totalCount: ACHIEVEMENTS.length,
    stats,
  };
}

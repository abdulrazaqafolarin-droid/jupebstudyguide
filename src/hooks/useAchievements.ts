import { useState, useEffect, useMemo } from 'react';
import { useUserStorage } from './useUserStorage';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: AchievementStats) => boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
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
}

const ACHIEVEMENTS: Achievement[] = [
  // Streak achievements
  {
    id: 'first_day',
    name: 'First Step',
    description: 'Complete your first study session',
    icon: '🌱',
    condition: (s) => s.totalDaysStudied >= 1,
    rarity: 'common',
  },
  {
    id: 'streak_3',
    name: 'Getting Consistent',
    description: 'Maintain a 3-day study streak',
    icon: '🔥',
    condition: (s) => s.longestStreak >= 3,
    rarity: 'common',
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day study streak',
    icon: '💪',
    condition: (s) => s.longestStreak >= 7,
    rarity: 'rare',
  },
  {
    id: 'streak_14',
    name: 'Fortnight Fighter',
    description: 'Maintain a 14-day study streak',
    icon: '⚔️',
    condition: (s) => s.longestStreak >= 14,
    rarity: 'epic',
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day study streak',
    icon: '👑',
    condition: (s) => s.longestStreak >= 30,
    rarity: 'legendary',
  },
  
  // Question achievements
  {
    id: 'first_10',
    name: 'Getting Started',
    description: 'Answer 10 questions',
    icon: '📚',
    condition: (s) => s.totalQuestionsAnswered >= 10,
    rarity: 'common',
  },
  {
    id: 'first_50',
    name: 'Dedicated Learner',
    description: 'Answer 50 questions',
    icon: '📖',
    condition: (s) => s.totalQuestionsAnswered >= 50,
    rarity: 'rare',
  },
  {
    id: 'first_100',
    name: 'Century Club',
    description: 'Answer 100 questions',
    icon: '💯',
    condition: (s) => s.totalQuestionsAnswered >= 100,
    rarity: 'rare',
  },
  {
    id: 'first_500',
    name: 'Knowledge Seeker',
    description: 'Answer 500 questions',
    icon: '🎓',
    condition: (s) => s.totalQuestionsAnswered >= 500,
    rarity: 'epic',
  },
  {
    id: 'first_1000',
    name: 'Question Master',
    description: 'Answer 1000 questions',
    icon: '🏅',
    condition: (s) => s.totalQuestionsAnswered >= 1000,
    rarity: 'legendary',
  },
  
  // Mastery achievements
  {
    id: 'master_10',
    name: 'First Mastery',
    description: 'Master 10 questions',
    icon: '✨',
    condition: (s) => s.questionsLearned >= 10,
    rarity: 'common',
  },
  {
    id: 'master_50',
    name: 'Rising Scholar',
    description: 'Master 50 questions',
    icon: '🌟',
    condition: (s) => s.questionsLearned >= 50,
    rarity: 'rare',
  },
  {
    id: 'master_100',
    name: 'Expert Level',
    description: 'Master 100 questions',
    icon: '🏆',
    condition: (s) => s.questionsLearned >= 100,
    rarity: 'epic',
  },
  {
    id: 'master_200',
    name: 'Grandmaster',
    description: 'Master 200 questions',
    icon: '💎',
    condition: (s) => s.questionsLearned >= 200,
    rarity: 'legendary',
  },
  
  // Accuracy achievements
  {
    id: 'accuracy_high',
    name: 'Sharp Mind',
    description: 'Get 80% accuracy over 50+ questions',
    icon: '🎯',
    condition: (s) => s.totalQuestionsAnswered >= 50 && (s.totalCorrect / s.totalQuestionsAnswered) >= 0.8,
    rarity: 'rare',
  },
  {
    id: 'accuracy_perfect',
    name: 'Perfectionist',
    description: 'Get 90% accuracy over 100+ questions',
    icon: '💫',
    condition: (s) => s.totalQuestionsAnswered >= 100 && (s.totalCorrect / s.totalQuestionsAnswered) >= 0.9,
    rarity: 'epic',
  },
  {
    id: 'perfect_10',
    name: 'Perfect Ten',
    description: 'Get 10 correct answers in a row',
    icon: '🔟',
    condition: (s) => s.totalCorrect >= 10,
    rarity: 'rare',
  },
  
  // Subject achievements
  {
    id: 'all_subjects',
    name: 'Well Rounded',
    description: 'Study all three subjects',
    icon: '🌈',
    condition: (s) => s.subjectsStudied >= 3,
    rarity: 'common',
  },
  {
    id: 'four_subjects',
    name: 'Renaissance Student',
    description: 'Study all four subjects',
    icon: '🎨',
    condition: (s) => s.subjectsStudied >= 4,
    rarity: 'rare',
  },
  
  // Document upload achievements
  {
    id: 'first_upload',
    name: 'Content Creator',
    description: 'Upload your first document',
    icon: '📤',
    condition: (s) => (s.documentsUploaded ?? 0) >= 1,
    rarity: 'common',
  },
  {
    id: 'upload_5',
    name: 'Resource Builder',
    description: 'Upload 5 documents',
    icon: '📂',
    condition: (s) => (s.documentsUploaded ?? 0) >= 5,
    rarity: 'rare',
  },
  {
    id: 'upload_10',
    name: 'Archive Master',
    description: 'Upload 10 documents',
    icon: '🗃️',
    condition: (s) => (s.documentsUploaded ?? 0) >= 10,
    rarity: 'epic',
  },
  
  // Syllabus achievements
  {
    id: 'syllabus_start',
    name: 'Journey Begins',
    description: 'Start the 30-day syllabus',
    icon: '🚀',
    condition: (s) => (s.syllabusProgress ?? 0) > 0,
    rarity: 'common',
  },
  {
    id: 'syllabus_week1',
    name: 'Week One Done',
    description: 'Complete 7 days of the syllabus',
    icon: '📆',
    condition: (s) => (s.syllabusProgress ?? 0) >= 7,
    rarity: 'common',
  },
  {
    id: 'syllabus_half',
    name: 'Halfway There',
    description: 'Complete 15 days of the syllabus',
    icon: '⏳',
    condition: (s) => (s.syllabusProgress ?? 0) >= 15,
    rarity: 'rare',
  },
  {
    id: 'syllabus_25',
    name: 'Final Push',
    description: 'Complete 25 days of the syllabus',
    icon: '🎢',
    condition: (s) => (s.syllabusProgress ?? 0) >= 25,
    rarity: 'epic',
  },
  {
    id: 'syllabus_complete',
    name: 'Syllabus Champion',
    description: 'Complete the entire 30-day syllabus',
    icon: '🏆',
    condition: (s) => s.syllabusCompleted === true,
    rarity: 'legendary',
  },
  
  // Special achievements
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Study after midnight',
    icon: '🦉',
    condition: () => {
      const hour = new Date().getHours();
      return hour >= 0 && hour < 5;
    },
    rarity: 'rare',
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Study before 6 AM',
    icon: '🐦',
    condition: () => {
      const hour = new Date().getHours();
      return hour >= 5 && hour < 6;
    },
    rarity: 'rare',
  },
];

const UNLOCKED_KEY = 'achievements-unlocked';

export function useAchievements(stats: AchievementStats) {
  const [unlockedArr, setUnlockedArr] = useUserStorage<string[]>(UNLOCKED_KEY, []);
  const unlockedIds = useMemo(() => new Set(unlockedArr), [unlockedArr]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([]);

  // Check for new achievements
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
    }
  }, [stats, unlockedIds, setUnlockedArr]);

  const clearNewlyUnlocked = () => {
    setNewlyUnlocked([]);
  };

  const unlockedAchievements = useMemo(() => 
    ACHIEVEMENTS.filter(a => unlockedIds.has(a.id)),
    [unlockedIds]
  );

  const lockedAchievements = useMemo(() => 
    ACHIEVEMENTS.filter(a => !unlockedIds.has(a.id)),
    [unlockedIds]
  );

  return {
    achievements: ACHIEVEMENTS,
    unlockedAchievements,
    lockedAchievements,
    newlyUnlocked,
    clearNewlyUnlocked,
    unlockedCount: unlockedIds.size,
    totalCount: ACHIEVEMENTS.length,
  };
}
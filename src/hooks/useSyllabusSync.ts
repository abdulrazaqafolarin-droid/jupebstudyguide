import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { SyllabusProgress } from '@/types/syllabus';
import type { StoredSyllabus } from './useSyllabusProgress';

function deserialize(data: StoredSyllabus): SyllabusProgress {
  return {
    ...data,
    startedAt: new Date(data.startedAt),
    lastStudiedAt: data.lastStudiedAt ? new Date(data.lastStudiedAt) : undefined,
    dailyTasks: data.dailyTasks.map(t => ({
      ...t,
      completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
    })),
    subjectProgress: data.subjectProgress as SyllabusProgress['subjectProgress'],
  };
}

function serialize(progress: SyllabusProgress): StoredSyllabus {
  return {
    combination: progress.combination,
    currentDay: progress.currentDay,
    dailyTasks: progress.dailyTasks.map(t => ({
      ...t,
      completedAt: t.completedAt ? (typeof t.completedAt === 'string' ? t.completedAt : t.completedAt.toISOString()) : undefined,
    })),
    startedAt: typeof progress.startedAt === 'string' ? progress.startedAt : progress.startedAt.toISOString(),
    lastStudiedAt: progress.lastStudiedAt ? (typeof progress.lastStudiedAt === 'string' ? progress.lastStudiedAt : progress.lastStudiedAt.toISOString()) : undefined,
    overallProgress: progress.overallProgress,
    subjectProgress: { ...progress.subjectProgress },
  };
}

/**
 * Syncs syllabus progress to Supabase on every change (debounced 600ms).
 * On mount, loads from Supabase if localStorage has no data (cross-device restore).
 */
export function useSyllabusSync(
  progress: SyllabusProgress | null,
  setProgress: (updater: SyllabusProgress | null | ((prev: SyllabusProgress | null) => SyllabusProgress | null)) => void,
  hasLocalData: boolean,
) {
  const { user } = useAuth();
  const lastHash = useRef<string>('');
  const hasAttemptedRestore = useRef(false);

  // Hydrate from Supabase on mount if localStorage has no data
  useEffect(() => {
    if (!user || hasAttemptedRestore.current) return;
    if (hasLocalData) {
      hasAttemptedRestore.current = true;
      return;
    }
    hasAttemptedRestore.current = true;

    supabase
      .from('syllabus_progress')
      .select('data')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return;
        const restored = deserialize(data.data as StoredSyllabus);
        setProgress(restored);
      });
  }, [user, hasLocalData, setProgress]);

  // Push changes to Supabase (debounced)
  useEffect(() => {
    if (!user || !progress) return;

    const serialized = serialize(progress);
    const hash = JSON.stringify(serialized);
    if (hash === lastHash.current) return;
    lastHash.current = hash;

    const t = setTimeout(() => {
      supabase
        .from('syllabus_progress')
        .upsert(
          { user_id: user.id, data: serialized },
          { onConflict: 'user_id' },
        )
        .then(({ error }) => { if (error) console.error('syllabus sync', error); });
    }, 600);
    return () => clearTimeout(t);
  }, [user, progress]);
}

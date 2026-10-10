import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { StudySessionData, StoredStudySession } from '@/types/syllabus';

export function useStudySessionSync(
  sessions: StudySessionData[],
  setSessions: (updater: StudySessionData[] | ((prev: StudySessionData[]) => StudySessionData[])) => void,
  hasLocalData: boolean,
) {
  const { user } = useAuth();
  const lastHash = useRef<string>('');
  const hasAttemptedRestore = useRef(false);

  useEffect(() => {
    if (!user || hasAttemptedRestore.current) return;
    if (hasLocalData) {
      hasAttemptedRestore.current = true;
      return;
    }
    hasAttemptedRestore.current = true;

    supabase
      .from('study_sessions')
      .select('sessions')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return;
        const raw = data.sessions as unknown as StoredStudySession[];
        if (Array.isArray(raw) && raw.length > 0) {
          const hydrated: StudySessionData[] = raw.map((s) => ({
            ...s,
            progress: {
              ...s.progress,
              startedAt: new Date(s.progress.startedAt),
              lastStudiedAt: s.progress.lastStudiedAt ? new Date(s.progress.lastStudiedAt) : undefined,
              dailyTasks: (s.progress.dailyTasks ?? []).map((t) => ({
                ...t,
                completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
              })),
            },
          }));
          setSessions(hydrated);
        }
      });
  }, [user, hasLocalData, setSessions]);

  useEffect(() => {
    if (!user) return;
    const hash = JSON.stringify(sessions.map(s => ({ id: s.id, updatedAt: s.updatedAt, status: s.status })));
    if (hash === lastHash.current) return;
    lastHash.current = hash;

    const t = setTimeout(() => {
      const serialized = JSON.parse(JSON.stringify(sessions));
      supabase
        .from('study_sessions')
        .upsert(
          { user_id: user.id, sessions: serialized },
          { onConflict: 'user_id' },
        )
        .then(({ error }) => { if (error) console.error('study sessions sync', error); });
    }, 600);
    return () => clearTimeout(t);
  }, [user, sessions]);
}

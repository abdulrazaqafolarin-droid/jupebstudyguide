import { describe, expect, it } from 'vitest';
import type { StudySessionData } from '@/types/syllabus';
import { mergeStudySessions } from './study-session-sync';

function session(id: string, updatedAt: string, name = id): StudySessionData {
  return {
    id,
    name,
    subjects: ['physics'],
    status: 'active',
    startDate: '2026-11-01',
    dailyGoalMinutes: 30,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt,
    progress: {
      combination: { core: ['physics'], elective: [] },
      currentDay: 1,
      dailyTasks: [],
      startedAt: new Date('2026-11-01T00:00:00.000Z'),
      overallProgress: 0,
      subjectProgress: { physics: 0, chemistry: 0, biology: 0, math: 0 },
    },
  };
}

describe('mergeStudySessions', () => {
  it('keeps sessions that exist only locally or only in the cloud', () => {
    const merged = mergeStudySessions(
      [session('local-only', '2026-11-02T00:00:00.000Z')],
      [session('cloud-only', '2026-11-03T00:00:00.000Z')],
    );

    expect(merged.map(item => item.id).sort()).toEqual(['cloud-only', 'local-only']);
  });

  it('keeps the newest copy when a session exists on both sides', () => {
    const local = session('same', '2026-11-04T00:00:00.000Z', 'Offline edits');
    const cloud = session('same', '2026-11-03T00:00:00.000Z', 'Older cloud copy');

    expect(mergeStudySessions([local], [cloud])[0].name).toBe('Offline edits');
    expect(mergeStudySessions([cloud], [local])[0].name).toBe('Offline edits');
  });

  it('prefers local state when timestamps are equal', () => {
    const local = session('same', '2026-11-04T00:00:00.000Z', 'Local copy');
    const cloud = session('same', '2026-11-04T00:00:00.000Z', 'Cloud copy');

    expect(mergeStudySessions([local], [cloud])[0].name).toBe('Local copy');
  });

  it('does not mutate either input array', () => {
    const local = [session('local', '2026-11-02T00:00:00.000Z')];
    const cloud = [session('cloud', '2026-11-03T00:00:00.000Z')];
    const localBefore = [...local];
    const cloudBefore = [...cloud];

    mergeStudySessions(local, cloud);

    expect(local).toEqual(localBefore);
    expect(cloud).toEqual(cloudBefore);
  });
});

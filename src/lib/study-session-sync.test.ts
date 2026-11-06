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

  it('merges different completed syllabus days from two offline devices', () => {
    const local = session('same', '2026-11-05T10:02:00.000Z', 'Local');
    const cloud = session('same', '2026-11-05T10:01:00.000Z', 'Cloud');
    local.progress.dailyTasks = [
      { day: 1, subject: 'physics', topics: [], learningObjectives: [], checkpointQuestions: [], isCompleted: true, completedAt: new Date('2026-11-05T10:02:00.000Z'), masteryScore: 85 },
      { day: 2, subject: 'chemistry', topics: [], learningObjectives: [], checkpointQuestions: [], isCompleted: false },
    ];
    cloud.progress.dailyTasks = [
      { day: 1, subject: 'physics', topics: [], learningObjectives: [], checkpointQuestions: [], isCompleted: false },
      { day: 2, subject: 'chemistry', topics: [], learningObjectives: [], checkpointQuestions: [], isCompleted: true, completedAt: new Date('2026-11-05T10:01:00.000Z'), masteryScore: 90 },
    ];
    local.progress.currentDay = 2;
    cloud.progress.currentDay = 3;

    const merged = mergeStudySessions([local], [cloud])[0];

    expect(merged.name).toBe('Local');
    expect(merged.progress.dailyTasks.map(task => task.isCompleted)).toEqual([true, true]);
    expect(merged.progress.currentDay).toBe(3);
    expect(merged.progress.overallProgress).toBe(100);
    expect(merged.progress.dailyTasks[0].masteryScore).toBe(85);
    expect(merged.progress.dailyTasks[1].masteryScore).toBe(90);
  });

  it('retains a completed task when the newer device has a stale incomplete copy', () => {
    const local = session('same', '2026-11-05T10:00:00.000Z', 'Local');
    const cloud = session('same', '2026-11-05T10:05:00.000Z', 'Cloud');
    local.progress.dailyTasks = [
      { day: 1, subject: 'physics', topics: [], learningObjectives: [], checkpointQuestions: [], isCompleted: true, completedAt: new Date('2026-11-05T10:00:00.000Z'), masteryScore: 75 },
    ];
    cloud.progress.dailyTasks = [
      { day: 1, subject: 'physics', topics: [], learningObjectives: [], checkpointQuestions: [], isCompleted: false },
    ];

    const merged = mergeStudySessions([local], [cloud])[0];

    expect(merged.name).toBe('Cloud');
    expect(merged.progress.dailyTasks[0].isCompleted).toBe(true);
    expect(merged.progress.dailyTasks[0].masteryScore).toBe(75);
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

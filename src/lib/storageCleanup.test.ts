import { afterEach, describe, expect, it } from 'vitest';
import { purgeForeignUserData } from './storageCleanup';

describe('auth storage cleanup', () => {
  afterEach(() => localStorage.clear());

  it('retains other account namespaces when a different user signs in', () => {
    localStorage.setItem('u:user-a:study-progress', '{"q1":{}}');
    localStorage.setItem('u:user-a:study-sessions', '[]');
    localStorage.setItem('u:user-b:study-progress', '{"q2":{}}');

    purgeForeignUserData('user-b');

    expect(localStorage.getItem('u:user-a:study-progress')).toBe('{"q1":{}}');
    expect(localStorage.getItem('u:user-a:study-sessions')).toBe('[]');
    expect(localStorage.getItem('u:user-b:study-progress')).toBe('{"q2":{}}');
  });

  it('retains namespaced and legacy learning data when a user signs out', () => {
    localStorage.setItem('u:user-a:study-progress', '{"q1":{}}');
    localStorage.setItem('jupeb_study_bookmarks', '[{"questionId":"q1"}]');

    purgeForeignUserData(null);

    expect(localStorage.getItem('u:user-a:study-progress')).toBe('{"q1":{}}');
    expect(localStorage.getItem('jupeb_study_bookmarks')).toBe('[{"questionId":"q1"}]');
  });
});

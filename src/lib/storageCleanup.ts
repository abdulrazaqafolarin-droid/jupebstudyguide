const LEGACY_KEYS = [
  'jupeb-study-progress',
  'jupeb_streak_data',
  'jupeb_achievements_unlocked',
  'jupeb_syllabus_progress',
  'jupeb-chat-hub',
];

export function purgeForeignUserData(currentUserId: string | null) {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (LEGACY_KEYS.includes(k)) {
        toRemove.push(k);
        continue;
      }
      if (k.startsWith('u:')) {
        const ownerId = k.split(':')[1];
        if (!currentUserId || ownerId !== currentUserId) {
          toRemove.push(k);
        }
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'subject-lock-expires-at';

function getEndTime(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed === 'number' && parsed > Date.now()) return parsed;
    }
  } catch {}
  const end = Date.now() + 24 * 60 * 60 * 1000;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(end)); } catch {}
  return end;
}

interface SubjectLockTimer {
  remainingMs: number;
  isExpired: boolean;
  timeLeft: string;
  progress: number;
}

function formatTime(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function useSubjectLockTimer(isAdmin?: boolean): SubjectLockTimer {
  const [endTime, setEndTime] = useState(getEndTime);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (endTime <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endTime]);

  const remainingMs = Math.max(0, endTime - now);
  const isExpired = isAdmin || remainingMs <= 0;
  const totalDuration = 24 * 60 * 60 * 1000;
  const progress = isExpired ? 0 : remainingMs / totalDuration;

  return {
    remainingMs,
    isExpired,
    timeLeft: formatTime(remainingMs),
    progress,
  };
}

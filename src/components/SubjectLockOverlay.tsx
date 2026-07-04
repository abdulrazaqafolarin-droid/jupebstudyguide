import { Clock } from 'lucide-react';
import { useSubjectLockTimer } from '@/hooks/useSubjectLockTimer';

export function SubjectLockOverlay() {
  const { timeLeft, progress, isExpired } = useSubjectLockTimer();

  if (isExpired) return null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
      <Clock className="h-8 w-8 text-yellow-400 mb-2" />
      <p className="text-sm font-semibold text-white mb-1">Coming Soon</p>
      <p className="text-2xl font-mono font-bold text-yellow-400 tabular-nums">
        {timeLeft}
      </p>
      <div className="mt-2 h-1.5 w-3/4 rounded-full bg-white/20 overflow-hidden">
        <div
          className="h-full rounded-full bg-yellow-400 transition-all duration-1000"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-white/60">Available in</p>
    </div>
  );
}

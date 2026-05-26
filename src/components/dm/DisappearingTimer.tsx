import { useEffect, useState } from 'react';
import { Timer, TimerOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  expiresAt: string | null;
  className?: string;
}

export function DisappearingTimer({ expiresAt, className }: Props) {
  const [remaining, setRemaining] = useState<string>('');

  useEffect(() => {
    if (!expiresAt) return;

    function tick() {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setRemaining('Expired');
        return;
      }

      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) setRemaining(`${days}d`);
      else if (hours > 0) setRemaining(`${hours}h`);
      else if (minutes > 0) setRemaining(`${minutes}m`);
      else setRemaining(`${seconds}s`);
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt) return null;

  const expired = remaining === 'Expired';

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[10px]', className)}>
      {expired ? (
        <TimerOff className="w-3 h-3 text-muted-foreground" />
      ) : (
        <Timer className={cn('w-3 h-3', remaining.endsWith('s') ? 'text-amber-500' : 'text-muted-foreground')} />
      )}
      <span className={expired ? 'text-muted-foreground' : undefined}>{remaining}</span>
    </span>
  );
}

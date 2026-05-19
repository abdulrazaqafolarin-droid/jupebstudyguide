import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeeklyCountdownProps {
  weekEnd: string;
  className?: string;
}

export default function WeeklyCountdown({ weekEnd, className }: WeeklyCountdownProps) {
  const [remaining, setRemaining] = useState(calcRemaining(weekEnd));

  useEffect(() => {
    const tick = () => setRemaining(calcRemaining(weekEnd));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [weekEnd]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Clock className="w-4 h-4 text-primary shrink-0" />
      <span className="text-sm font-medium tabular-nums">
        {remaining.days > 0
          ? `${remaining.days}d ${remaining.hours}h ${remaining.minutes}m`
          : `${remaining.hours}h ${remaining.minutes}m ${remaining.seconds}s`}
      </span>
      <span className="text-[10px] text-muted-foreground">until reset</span>
    </div>
  );
}

function calcRemaining(weekEnd: string) {
  const diff = Math.max(0, new Date(weekEnd).getTime() - Date.now());
  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return { days, hours, minutes, seconds };
}

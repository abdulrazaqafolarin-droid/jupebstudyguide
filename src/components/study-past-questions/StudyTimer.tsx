import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Square, Clock, AlertTriangle, TimerOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudyTimerProps {
  state: "idle" | "running" | "paused" | "expired";
  formatted: string;
  progress: number;
  duration: number;
  noTimer?: boolean;
  onStart?: (minutes: number) => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onToggleNoTimer?: () => void;
}

const PRESETS = [5, 10, 15, 30];
const CIRCUMFERENCE = 2 * Math.PI * 40;

export function StudyTimer({
  state,
  formatted,
  progress,
  duration,
  noTimer,
  onStart,
  onPause,
  onResume,
  onStop,
  onToggleNoTimer,
}: StudyTimerProps) {
  const [customMinutes, setCustomMinutes] = useState<string>("");

  const handlePreset = (m: number) => {
    onStart?.(m);
    setCustomMinutes("");
  };

  const handleCustom = () => {
    const m = parseInt(customMinutes, 10);
    if (m > 0 && m <= 180) {
      onStart?.(m);
      setCustomMinutes("");
    }
  };

  const offset = CIRCUMFERENCE - (1 - progress) * CIRCUMFERENCE;
  const warnThreshold = state === "running" && progress <= 0.1 && progress > 0.02;
  const critThreshold = state === "running" && progress <= 0.02;

  if (noTimer) {
    return (
      <div className="flex items-center justify-center gap-3 py-2">
        <TimerOff className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Timer disabled</span>
        <button
          onClick={onToggleNoTimer}
          className="px-3 py-1 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.97]"
        >
          Enable Timer
        </button>
      </div>
    );
  }

  return (
    <div data-tour="pq-timer" className="flex flex-col items-center gap-4 p-5 rounded-2xl bg-card border">
      <div className="relative flex items-center justify-center">
        <svg width="100" height="100" className="transform -rotate-90">
          <circle
            cx="50" cy="50" r="40"
            fill="none" stroke="hsl(var(--muted))" strokeWidth="5"
          />
          <motion.circle
            cx="50" cy="50" r="40"
            fill="none"
            stroke={
              state === "expired" ? "hsl(var(--destructive))" :
              critThreshold ? "hsl(var(--destructive))" :
              warnThreshold ? "hsl(38, 92%, 50%)" :
              "hsl(var(--primary))"
            }
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            initial={false}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          />
        </svg>
        <span className={cn(
          "absolute text-xl font-bold tabular-nums transition-colors",
          critThreshold && "text-destructive",
          warnThreshold && "text-amber-500",
        )}>
          {formatted}
        </span>
      </div>

      {/* Linear progress bar */}
      {state !== "idle" && state !== "expired" && (
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full transition-colors",
              critThreshold ? "bg-destructive" :
              warnThreshold ? "bg-amber-500" :
              "bg-primary"
            )}
            initial={false}
            animate={{ width: `${(1 - progress) * 100}%` }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          />
        </div>
      )}

      {/* Warning pulse */}
      {critThreshold && state === "running" && (
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          className="text-xs font-medium text-destructive"
        >
          Time almost up!
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col items-center gap-3 w-full"
          >
            <div className="flex gap-2 flex-wrap justify-center">
              {PRESETS.map((m, idx) => {
                const gradients = [
                  'from-emerald-500/20 to-emerald-600/10 hover:from-emerald-500/30 hover:to-emerald-600/20',
                  'from-sky-500/20 to-sky-600/10 hover:from-sky-500/30 hover:to-sky-600/20',
                  'from-violet-500/20 to-violet-600/10 hover:from-violet-500/30 hover:to-violet-600/20',
                  'from-rose-500/20 to-rose-600/10 hover:from-rose-500/30 hover:to-rose-600/20',
                ];
                return (
                  <button
                    key={m}
                    onClick={() => handlePreset(m)}
                    className={`relative overflow-hidden px-3 sm:px-3.5 py-2 text-xs font-medium rounded-lg bg-gradient-to-br ${gradients[idx]} text-foreground hover:shadow-sm transition-all active:scale-[0.97]`}
                  >
                    <span className="relative z-10">{m}<span className="text-[10px] text-muted-foreground ml-0.5">min</span></span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="number"
                  min={1} max={180}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  placeholder="Custom"
                  className="w-20 px-3 py-2 text-xs rounded-lg border bg-background text-center focus:outline-none focus:ring-2 focus:ring-primary/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  onKeyDown={(e) => e.key === "Enter" && handleCustom()}
                />
              </div>
              {customMinutes && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={handleCustom}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.97]"
                >
                  <Play className="h-4 w-4" />
                </motion.button>
              )}
            </div>
            {onToggleNoTimer && (
              <button
                onClick={onToggleNoTimer}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <TimerOff className="h-3 w-3" />
                No timer
              </button>
            )}
          </motion.div>
        )}

        {state === "running" && (
          <motion.div
            key="running"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="flex gap-2"
          >
            <button
              onClick={onPause}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors active:scale-[0.97]"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </button>
            <button
              onClick={onStop}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors active:scale-[0.97]"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </button>
          </motion.div>
        )}

        {state === "paused" && (
          <motion.div
            key="paused"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="flex gap-2"
          >
            <button
              onClick={onResume}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.97]"
            >
              <Play className="h-3.5 w-3.5" />
              Resume
            </button>
            <button
              onClick={onStop}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors active:scale-[0.97]"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </button>
          </motion.div>
        )}

        {state === "expired" && (
          <motion.div
            key="expired"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col items-center gap-2"
          >
            <motion.div
              animate={{ boxShadow: ["0 0 0 0 hsl(var(--destructive)/0.4)", "0 0 0 12px hsl(var(--destructive)/0)"] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: [0.23, 1, 0.32, 1] }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium"
            >
              <AlertTriangle className="h-4 w-4" />
              Time&rsquo;s up!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {state !== "idle" && state !== "expired" && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="tabular-nums">{duration / 60} min</span>
        </div>
      )}
    </div>
  );
}

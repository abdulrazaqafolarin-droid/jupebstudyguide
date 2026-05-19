import { useState, useRef, useCallback, useEffect } from "react";

export type TimerState = "idle" | "running" | "paused" | "expired";

const WARN_THRESHOLD = 30; // seconds
const CRITICAL_THRESHOLD = 10; // seconds

export function useQuestionTimer() {
  const [state, setState] = useState<TimerState>("idle");
  const [duration, setDuration] = useState(0); // total seconds
  const [remaining, setRemaining] = useState(0); // seconds left
  const [noTimer, setNoTimer] = useState(() => localStorage.getItem("noTimer") === "true");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const start = useCallback((minutes: number) => {
    if (noTimer) return;
    clear();
    const secs = minutes * 60;
    setDuration(secs);
    setRemaining(secs);
    setState("running");
  }, [clear, noTimer]);

  const pause = useCallback(() => {
    if (state === "running") {
      clear();
      setState("paused");
    }
  }, [state, clear]);

  const resume = useCallback(() => {
    if (state === "paused") {
      setState("running");
    }
  }, [state]);

  const stop = useCallback(() => {
    clear();
    setState("idle");
    setRemaining(0);
  }, [clear]);

  const toggleNoTimer = useCallback(() => {
    const next = !noTimer;
    setNoTimer(next);
    localStorage.setItem("noTimer", String(next));
    if (next) {
      clear();
      setState("idle");
      setRemaining(0);
    }
  }, [noTimer, clear]);

  useEffect(() => {
    if (state === "running") {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clear();
            setState("expired");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return clear;
  }, [state, clear]);

  const progress = duration > 0 ? remaining / duration : 0;
  const formatted = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  const isWarning = state === "running" && remaining <= WARN_THRESHOLD;
  const isCritical = state === "running" && remaining <= CRITICAL_THRESHOLD;

  return {
    state, duration, remaining, progress, formatted,
    start, pause, resume, stop, noTimer, toggleNoTimer,
    isWarning, isCritical,
  };
}

import { useState, useRef, useCallback, useEffect } from "react";

export type TimerState = "idle" | "running" | "expired";

export function useQuizTimer() {
  const [state, setState] = useState<TimerState>("idle");
  const [duration, setDuration] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpireRef = useRef<(() => void) | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const start = useCallback((minutes: number, onExpire?: () => void) => {
    clear();
    const secs = minutes * 60;
    setDuration(secs);
    setRemaining(secs);
    setState("running");
    setEnabled(true);
    if (onExpire) onExpireRef.current = onExpire;
  }, [clear]);

  const stop = useCallback(() => {
    clear();
    setState("idle");
    setRemaining(0);
    setEnabled(false);
    onExpireRef.current = null;
  }, [clear]);

  const reset = useCallback((onExpire?: () => void) => {
    stop();
    setDuration(0);
    if (onExpire) onExpireRef.current = onExpire;
  }, [stop]);

  useEffect(() => {
    if (state !== "running") return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return clear;
  }, [state, clear]);

  useEffect(() => {
    if (state === "running" && remaining === 0 && duration > 0) {
      clear();
      setState("expired");
      onExpireRef.current?.();
      onExpireRef.current = null;
    }
  }, [remaining, state, duration, clear]);

  const progress = duration > 0 ? remaining / duration : 1;
  const formatted = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  return {
    state, duration, remaining, progress, formatted, enabled,
    start, stop, reset,
  };
}

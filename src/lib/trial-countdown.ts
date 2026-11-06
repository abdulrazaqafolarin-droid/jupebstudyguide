const pad = (value: number) => String(value).padStart(2, "0");

/** Render a non-negative trial countdown in day/hour/minute/second form. */
export function formatTrialCountdown(millisecondsRemaining: number): string {
  const totalSeconds = Math.max(0, Math.ceil(millisecondsRemaining / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return days > 0 ? `${days}d ${clock}` : clock;
}

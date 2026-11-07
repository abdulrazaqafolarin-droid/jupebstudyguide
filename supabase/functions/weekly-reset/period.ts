export interface CompletedWeekPeriod {
  startDate: string;
  endDate: string;
  startIso: string;
  endExclusiveIso: string;
}

/**
 * Return the last fully completed Monday-Sunday week using UTC boundaries.
 * The end timestamp is exclusive, so every instant on Sunday is included.
 */
export function getPreviousCompletedWeek(now: Date): CompletedWeekPeriod {
  const currentWeekStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  ));
  const daysSinceMonday = (currentWeekStart.getUTCDay() + 6) % 7;
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - daysSinceMonday);

  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7);

  const previousWeekEnd = new Date(currentWeekStart);
  previousWeekEnd.setUTCDate(previousWeekEnd.getUTCDate() - 1);

  return {
    startDate: previousWeekStart.toISOString().slice(0, 10),
    endDate: previousWeekEnd.toISOString().slice(0, 10),
    startIso: previousWeekStart.toISOString(),
    endExclusiveIso: currentWeekStart.toISOString(),
  };
}

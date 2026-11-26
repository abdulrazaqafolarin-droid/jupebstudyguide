export interface JambCbtAttemptSummary {
  id: string;
  subject: string;
  attemptKind: string;
  status: "submitted" | "expired";
  examYear: number;
  durationMinutes: number;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  correct: number;
  wrong: number;
  ungraded: number;
  total: number;
  gradable: number;
}

export interface JambCbtDaySummary {
  date: string;
  label: string;
  attemptCount: number;
  averageScore: number | null;
  bestScore: number | null;
}

export interface JambCbtSubjectSummary {
  subject: string;
  attemptCount: number;
  scoredAttemptCount: number;
  averageScore: number | null;
  bestScore: number | null;
}

export interface JambCbtAnalytics {
  attemptCount: number;
  scoredAttemptCount: number;
  ungradedAttemptCount: number;
  averageScore: number | null;
  bestScore: number | null;
  weekly: JambCbtDaySummary[];
  bySubject: JambCbtSubjectSummary[];
}

function localDateKey(date: Date): string {
  return date.getFullYear() + "-" +
    String(date.getMonth() + 1).padStart(2, "0") + "-" +
    String(date.getDate()).padStart(2, "0");
}

function safeNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function scoreOf(attempt: JambCbtAttemptSummary): number | null {
  return typeof attempt.score === "number" && Number.isFinite(attempt.score) &&
    attempt.score >= 0 && attempt.score <= 100
    ? attempt.score
    : null;
}

function mean(values: number[]): number | null {
  return values.length
    ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
    : null;
}

export function getJambCbtAnalytics(
  attempts: JambCbtAttemptSummary[],
  now = new Date(),
  dayCount = 7,
): JambCbtAnalytics {
  const valid = attempts.filter((attempt) =>
    Boolean(attempt.id) &&
    ["submitted", "expired"].includes(attempt.status) &&
    Boolean(attempt.subject),
  );
  const scored = valid.flatMap((attempt) => {
    const score = scoreOf(attempt);
    return score === null ? [] : [score];
  });

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekly = Array.from({ length: Math.max(0, dayCount) }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (dayCount - index - 1));
    const key = localDateKey(date);
    const dayAttempts = valid.filter((attempt) => {
      const timestamp = attempt.submittedAt ?? attempt.startedAt;
      const parsed = new Date(timestamp);
      return Number.isFinite(parsed.getTime()) && localDateKey(parsed) === key;
    });
    const scores = dayAttempts.flatMap((attempt) => {
      const score = scoreOf(attempt);
      return score === null ? [] : [score];
    });
    return {
      date: key,
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      attemptCount: dayAttempts.length,
      averageScore: mean(scores),
      bestScore: scores.length ? Math.max(...scores) : null,
    };
  });

  const subjects = [...new Set(valid.map((attempt) => attempt.subject))].sort();
  const bySubject = subjects.map((subject) => {
    const subjectAttempts = valid.filter((attempt) => attempt.subject === subject);
    const scores = subjectAttempts.flatMap((attempt) => {
      const score = scoreOf(attempt);
      return score === null ? [] : [score];
    });
    return {
      subject,
      attemptCount: subjectAttempts.length,
      scoredAttemptCount: scores.length,
      averageScore: mean(scores),
      bestScore: scores.length ? Math.max(...scores) : null,
    };
  });

  return {
    attemptCount: valid.length,
    scoredAttemptCount: scored.length,
    ungradedAttemptCount: valid.length - scored.length,
    averageScore: mean(scored),
    bestScore: scored.length ? Math.max(...scored) : null,
    weekly,
    bySubject,
  };
}

export function mapJambCbtHistoryPayload(value: unknown): JambCbtAttemptSummary[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): JambCbtAttemptSummary[] => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const result = row.result && typeof row.result === "object"
      ? row.result as Record<string, unknown>
      : {};
    const id = typeof row.id === "string" ? row.id : "";
    const subject = typeof row.subject === "string" ? row.subject : "";
    const status = row.status === "submitted" || row.status === "expired" ? row.status : null;
    if (!id || !subject || !status) return [];
    const scoreValue = result.score;
    const score = scoreValue === null || scoreValue === undefined
      ? null
      : Number.isFinite(Number(scoreValue)) ? Number(scoreValue) : null;
    return [{
      id,
      subject,
      attemptKind: typeof row.attempt_kind === "string" ? row.attempt_kind : "subject_practice",
      status,
      examYear: safeNumber(row.exam_year),
      durationMinutes: safeNumber(row.duration_minutes),
      startedAt: typeof row.started_at === "string" ? row.started_at : "",
      submittedAt: typeof row.submitted_at === "string" ? row.submitted_at : null,
      score,
      correct: safeNumber(result.correct),
      wrong: safeNumber(result.wrong),
      ungraded: safeNumber(result.ungraded),
      total: safeNumber(result.total),
      gradable: safeNumber(result.gradable),
    }];
  });
}

import { describe, expect, it } from "vitest";
import { getJambCbtAnalytics, mapJambCbtHistoryPayload } from "./jamb-cbt-analytics";
import type { JambCbtAttemptSummary } from "./jamb-cbt-analytics";

const attempt = (
  id: string,
  subject: string,
  submittedAt: string,
  score: number | null,
): JambCbtAttemptSummary => ({
  id,
  subject,
  attemptKind: "subject_practice",
  status: "submitted",
  examYear: 2027,
  durationMinutes: 20,
  startedAt: submittedAt,
  submittedAt,
  score,
  correct: score === null ? 0 : 12,
  wrong: score === null ? 0 : 5,
  ungraded: score === null ? 3 : 0,
  total: 20,
  gradable: score === null ? 0 : 17,
});

describe("JAMB CBT result analytics", () => {
  it("aggregates only server-provided scores and never counts ungraded attempts as zero", () => {
    const data = getJambCbtAnalytics([
      attempt("a", "physics", "2026-11-18T08:00:00.000Z", 80),
      attempt("b", "physics", "2026-11-17T08:00:00.000Z", null),
      attempt("c", "biology", "2026-11-18T09:00:00.000Z", 60),
    ], new Date("2026-11-18T12:00:00.000Z"));

    expect(data.attemptCount).toBe(3);
    expect(data.scoredAttemptCount).toBe(2);
    expect(data.ungradedAttemptCount).toBe(1);
    expect(data.averageScore).toBe(70);
    expect(data.bestScore).toBe(80);
    expect(data.bySubject.find((row) => row.subject === "physics")?.averageScore).toBe(80);
    expect(data.bySubject.find((row) => row.subject === "biology")?.averageScore).toBe(60);
  });

  it("keeps a weekly series and uses submission time for attempt activity", () => {
    const data = getJambCbtAnalytics([
      attempt("a", "chemistry", "2026-11-18T10:00:00.000Z", 90),
      attempt("b", "chemistry", "2026-11-18T11:00:00.000Z", 70),
    ], new Date("2026-11-18T12:00:00.000Z"), 7);

    expect(data.weekly).toHaveLength(7);
    expect(data.weekly[6].date).toBe("2026-11-18");
    expect(data.weekly[6].attemptCount).toBe(2);
    expect(data.weekly[6].averageScore).toBe(80);
    expect(data.weekly[6].bestScore).toBe(90);
  });

  it("returns null score summaries when every attempt is ungraded", () => {
    const data = getJambCbtAnalytics([
      attempt("a", "physics", "2026-11-18T08:00:00.000Z", null),
    ], new Date("2026-11-18T12:00:00.000Z"));

    expect(data.averageScore).toBeNull();
    expect(data.bestScore).toBeNull();
    expect(data.ungradedAttemptCount).toBe(1);
  });

  it("maps only terminal, structurally valid owned-history payload records", () => {
    const result = mapJambCbtHistoryPayload([
      { id: "a", subject: "physics", status: "submitted", exam_year: 2027, duration_minutes: 20,
        started_at: "2026-11-18T08:00:00.000Z", submitted_at: "2026-11-18T08:20:00.000Z",
        result: { score: 85, correct: 17, wrong: 3, ungraded: 0, total: 20, gradable: 20 } },
      { id: "b", subject: "biology", status: "in_progress" },
      { subject: "chemistry", status: "submitted" },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(85);
    expect(result[0].correct).toBe(17);
  });
});

import { describe, expect, it } from "vitest";
import {
  getJambDueQuestionIds,
  getJambReviewStats,
  scheduleJambReview,
  type JambReviewProgress,
} from "./jamb-review";

const DAY = 86_400_000;

describe("JAMB spaced review scheduling", () => {
  it("schedules Again shortly, and Hard/Good/Easy at increasing intervals", () => {
    const now = 1_800_000_000_000;
    expect(scheduleJambReview("q1", undefined, 1, now).nextReviewAt).toBe(now + 600_000);
    expect(scheduleJambReview("q2", undefined, 3, now).nextReviewAt).toBe(now + DAY);
    expect(scheduleJambReview("q3", undefined, 4, now).nextReviewAt).toBe(now + 2 * DAY);
    expect(scheduleJambReview("q4", undefined, 5, now).nextReviewAt).toBe(now + 4 * DAY);
  });

  it("increases intervals across successful reviews and keeps a safe minimum ease factor", () => {
    const now = 1_800_000_000_000;
    const first = scheduleJambReview("q1", undefined, 4, now);
    const second = scheduleJambReview("q1", first, 4, first.nextReviewAt);
    const third = scheduleJambReview("q1", second, 5, second.nextReviewAt);
    expect(second.intervalDays).toBe(5);
    expect(third.intervalDays).toBeGreaterThan(second.intervalDays);
    expect(third.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it("resets repetitions after an Again rating", () => {
    const now = 1_800_000_000_000;
    const first = scheduleJambReview("q1", undefined, 5, now);
    const second = scheduleJambReview("q1", first, 1, first.nextReviewAt);
    expect(second.repetitions).toBe(0);
    expect(second.intervalDays).toBe(0);
    expect(second.nextReviewAt).toBe(second.lastReviewedAt + 600_000);
  });

  it("returns unseen and overdue questions first without mutating stored progress", () => {
    const now = 1_800_000_000_000;
    const progress: Record<string, JambReviewProgress> = {
      later: scheduleJambReview("later", undefined, 5, now),
      due: scheduleJambReview("due", undefined, 1, now - 700_000),
    };
    expect(getJambDueQuestionIds(["later", "unseen", "due"], progress, now)).toEqual(["unseen", "due"]);
    expect(progress.later.nextReviewAt).toBe(now + 4 * DAY);
  });

  it("calculates study, mastery and due counts for unique question IDs", () => {
    const now = 1_800_000_000_000;
    let mastered = scheduleJambReview("mastered", undefined, 5, now);
    mastered = scheduleJambReview("mastered", mastered, 5, mastered.nextReviewAt);
    mastered = scheduleJambReview("mastered", mastered, 5, mastered.nextReviewAt);
    const progress = { mastered, overdue: scheduleJambReview("overdue", undefined, 1, now - 700_000) };
    expect(getJambReviewStats(["mastered", "overdue", "new", "new"], progress, now)).toEqual({
      total: 3, studied: 2, mastered: 1, due: 2,
    });
  });

  it("rejects invalid ratings and missing question IDs", () => {
    expect(() => scheduleJambReview("q1", undefined, 6)).toThrow(RangeError);
    expect(() => scheduleJambReview("", undefined, 4)).toThrow("question ID");
  });
});

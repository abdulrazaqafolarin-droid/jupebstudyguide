import { scoreAttempt } from "./exam-scoring.ts";
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
Deno.test("scores verified keys and counts unanswered items as wrong", () => {
  const result = scoreAttempt(
    [{ sequence: 1, question_id: "q1" }, { sequence: 2, question_id: "q2" }, { sequence: 3, question_id: "q3" }],
    [{ question_sequence: 1, selected_option: "a" }, { question_sequence: 2, selected_option: null }],
    [{ question_id: "q1", correct_answer: "A" }, { question_id: "q2", correct_answer: "B" }],
  );
  assert(result.correct === 1 && result.wrong === 1, "Reviewed answers should be scored.");
  assert(result.ungraded === 1 && result.total === 3 && result.gradable === 2, "Unkeyed questions must remain ungraded and leave the denominator.");
  assert(result.score === 50, "Percentage must use only reviewed answer keys.");
});
Deno.test("all-ungraded attempts have no fabricated percentage", () => {
  const result = scoreAttempt([{ sequence: 1, question_id: "q1" }], [], []);
  assert(result.score === null && result.ungraded === 1, "An ungraded attempt has no percentage.");
});
Deno.test("verified historical E answers remain scorable", () => {
  const result = scoreAttempt([{ sequence: 1, question_id: "old" }], [{ question_sequence: 1, selected_option: "E" }], [{ question_id: "old", correct_answer: "e" }]);
  assert(result.correct === 1 && result.score === 100, "Historical five-option questions must preserve E keys.");
});

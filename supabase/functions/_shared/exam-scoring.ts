export interface ExamScoreSummary {
  /** Makes the validated score shape compatible with Supabase JSON and JSON records. */
  [key: string]: number | null;
  score: number | null;
  correct: number;
  wrong: number;
  ungraded: number;
  total: number;
  gradable: number;
}
export interface AttemptQuestionForScoring { sequence: number; question_id: string }
export interface AttemptAnswerForScoring { question_sequence: number; selected_option: string | null }
export interface ReviewedAnswerKey { question_id: string; correct_answer: string }

/** Only independently reviewed keys count; missing keys remain ungraded. */
export function scoreAttempt(
  questions: AttemptQuestionForScoring[],
  answers: AttemptAnswerForScoring[],
  answerKeys: ReviewedAnswerKey[],
): ExamScoreSummary {
  const answerBySequence = new Map(answers.map((answer) => [answer.question_sequence, answer.selected_option?.trim().toUpperCase() ?? null]));
  const keyByQuestionId = new Map(answerKeys.map((key) => [key.question_id, key.correct_answer.trim().toUpperCase()]));
  let correct = 0, wrong = 0, ungraded = 0;
  for (const question of questions) {
    const key = keyByQuestionId.get(question.question_id);
    if (!key) { ungraded += 1; continue; }
    if (answerBySequence.get(question.sequence) === key) correct += 1;
    else wrong += 1;
  }
  const gradable = correct + wrong;
  return { score: gradable ? Math.round((correct / gradable) * 100) : null, correct, wrong, ungraded, total: questions.length, gradable };
}

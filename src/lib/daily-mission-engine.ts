import type { Question, Difficulty, Subject } from "@/types/question";
import type { DailyTask, StudySessionData } from "@/types/syllabus";
import { hasGradableAnswer } from "@/lib/answer-scoring";

export type DailyMissionStage = "lesson" | "quiz" | "recovery" | "completed";

export interface DailyMissionAnswer {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
}

export interface DailyMissionAttempt {
  questionIds: string[];
  answers: DailyMissionAnswer[];
  accuracy: number;
  completedAt: string;
}

export interface DailyMissionRecord {
  id: string;
  localDate: string;
  sessionId: string;
  syllabusDay: number;
  subject: Subject;
  topicId: string;
  topicName: string;
  lessonTitle: string;
  lessonText: string;
  stage: DailyMissionStage;
  attemptNumber: number;
  currentQuestionIds: string[];
  currentAnswers: DailyMissionAnswer[];
  attempts: DailyMissionAttempt[];
  bestAccuracy: number | null;
  mistakeQuestionIds: string[];
  difficulty: Difficulty;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

const normalize = (value: string | undefined) =>
  (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function topicMatches(question: Question, task: DailyTask): boolean {
  const qTopic = normalize(question.topic);
  if (!qTopic) return false;
  return task.topics.some((topic) => {
    const name = normalize(topic.name);
    const subtopics = topic.subtopics.map(normalize);
    return Boolean(name && (qTopic.includes(name) || name.includes(qTopic))) ||
      subtopics.some((sub) => Boolean(sub && (qTopic.includes(sub) || sub.includes(qTopic))));
  });
}

function questionDifficulty(question: Question): Difficulty {
  return question.difficulty ?? "medium";
}

export function chooseMissionDifficulty(previousAccuracies: number[]): Difficulty {
  if (previousAccuracies.length === 0) return "medium";
  const latest = previousAccuracies[previousAccuracies.length - 1];
  if (latest >= 85) return "hard";
  if (latest < 70) return "easy";
  return "medium";
}

export function selectMissionQuestions(args: {
  pool: Question[];
  task: DailyTask;
  history: DailyMissionRecord[];
  count?: number;
  attemptNumber?: number;
  excludedQuestionIds?: string[];
  preferredQuestionIds?: string[];
  difficulty?: Difficulty;
}): Question[] {
  const {
    pool,
    task,
    history,
    count = 10,
    attemptNumber = 1,
    excludedQuestionIds = [],
    preferredQuestionIds = [],
    difficulty = "medium",
  } = args;
  const excluded = new Set(excludedQuestionIds);
  const priorMistakes = new Set(history.flatMap((mission) => mission.mistakeQuestionIds));
  const recentlySeen = new Set(history.slice(-2).flatMap((mission) => [
    ...mission.currentQuestionIds,
    ...mission.attempts.flatMap((attempt) => attempt.questionIds),
  ]));
  const uniquePool = [...new Map(pool.map((question) => [question.id, question])).values()];
  const valid = uniquePool.filter((question) =>
    question.subject === task.subject &&
    question.type === "mcq" &&
    (question.options?.length ?? 0) >= 2 &&
    hasGradableAnswer(question.correctAnswer) &&
    !excluded.has(question.id)
  );
  const score = (question: Question) => {
    let points = 0;
    if (preferredQuestionIds.includes(question.id)) points += 1000;
    if (priorMistakes.has(question.id)) points += 100;
    if (topicMatches(question, task)) points += 50;
    if (questionDifficulty(question) === difficulty) points += 10;
    if (recentlySeen.has(question.id) && !priorMistakes.has(question.id)) points -= 25;
    if (attemptNumber > 1 && !excluded.has(question.id)) points += 1;
    return points;
  };
  return [...valid]
    .sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))
    .slice(0, Math.min(count, valid.length));
}

export function buildMissionLesson(task: DailyTask): { title: string; text: string } {
  const topic = task.topics[0];
  if (!topic) {
    return {
      title: task.learningObjectives[0] ?? "Today's study focus",
      text: [
        task.learningObjectives[0] ?? "Review the key ideas for today's subject.",
        ...task.checkpointQuestions.slice(0, 2).map((question) => `Self-check: ${question}`),
      ].join("\n\n"),
    };
  }
  const subtopics = topic.subtopics.slice(0, 5);
  return {
    title: topic.name,
    text: [
      topic.description,
      subtopics.length ? `Focus points: ${subtopics.join(", ")}.` : "",
      task.learningObjectives.length
        ? `By the end, you should be able to: ${task.learningObjectives.slice(0, 3).join("; ")}.`
        : "",
      task.checkpointQuestions.length
        ? `Before the questions, check your understanding: ${task.checkpointQuestions.slice(0, 2).join(" ")}`
        : "",
    ].filter(Boolean).join("\n\n"),
  };
}

export function createDailyMission(args: {
  session: StudySessionData;
  task: DailyTask;
  questions: Question[];
  history: DailyMissionRecord[];
  localDate: string;
  now?: Date;
}): DailyMissionRecord | null {
  const { session, task, questions, history, localDate } = args;
  if (history.some((mission) => mission.localDate === localDate)) return null;
  const previousAccuracies = history.flatMap((mission) => mission.attempts.map((attempt) => attempt.accuracy));
  const difficulty = chooseMissionDifficulty(previousAccuracies);
  const selected = selectMissionQuestions({
    pool: questions,
    task,
    history,
    difficulty,
  });
  if (selected.length < 3) return null;
  const lesson = buildMissionLesson(task);
  const now = (args.now ?? new Date()).toISOString();
  return {
    id: `mission-${localDate}-${session.id}`,
    localDate,
    sessionId: session.id,
    syllabusDay: task.day,
    subject: task.subject,
    topicId: task.topics[0]?.id ?? `subject-${task.subject}`,
    topicName: task.topics[0]?.name ?? task.learningObjectives[0] ?? task.subject,
    lessonTitle: lesson.title,
    lessonText: lesson.text,
    stage: "lesson",
    attemptNumber: 1,
    currentQuestionIds: selected.map((question) => question.id),
    currentAnswers: [],
    attempts: [],
    bestAccuracy: null,
    mistakeQuestionIds: [],
    difficulty,
    createdAt: now,
    updatedAt: now,
  };
}

export function submitMissionAttempt(
  mission: DailyMissionRecord,
  pool: Question[],
  answers: DailyMissionAnswer[],
  now = new Date(),
): DailyMissionRecord {
  const byId = new Map(pool.map((question) => [question.id, question]));
  const questionIds = mission.currentQuestionIds;
  const normalizedAnswers = questionIds.map((questionId) => {
    const submitted = answers.find((answer) => answer.questionId === questionId);
    const question = byId.get(questionId);
    const isCorrect = Boolean(
      submitted &&
      question &&
      hasGradableAnswer(question.correctAnswer) &&
      submitted.selectedAnswer.trim().toUpperCase() === question.correctAnswer.trim().toUpperCase()
    );
    return {
      questionId,
      selectedAnswer: submitted?.selectedAnswer ?? "",
      isCorrect,
    };
  });
  const gradable = questionIds.filter((id) => {
    const question = byId.get(id);
    return Boolean(question && hasGradableAnswer(question.correctAnswer));
  });
  const correct = normalizedAnswers.filter((answer) =>
    gradable.includes(answer.questionId) && answer.isCorrect
  ).length;
  const accuracy = gradable.length ? Math.round((correct / gradable.length) * 100) : 0;
  const mistakes = normalizedAnswers.filter((answer) => !answer.isCorrect).map((answer) => answer.questionId);
  const attempt: DailyMissionAttempt = {
    questionIds,
    answers: normalizedAnswers,
    accuracy,
    completedAt: now.toISOString(),
  };
  const attempts = [...mission.attempts, attempt];
  const reachedTarget = accuracy >= 70;
  return {
    ...mission,
    stage: reachedTarget ? "completed" : "recovery",
    attemptNumber: mission.attemptNumber,
    currentAnswers: normalizedAnswers,
    attempts,
    bestAccuracy: Math.max(mission.bestAccuracy ?? 0, accuracy),
    mistakeQuestionIds: Array.from(new Set([...mission.mistakeQuestionIds, ...mistakes])),
    updatedAt: now.toISOString(),
    completedAt: reachedTarget ? now.toISOString() : undefined,
  };
}

export function prepareRecoveryAttempt(
  mission: DailyMissionRecord,
  pool: Question[],
  history: DailyMissionRecord[],
): DailyMissionRecord {
  const excluded = new Set(mission.attempts.flatMap((attempt) => attempt.questionIds));
  const targetedTask: DailyTask = {
    day: mission.syllabusDay,
    topics: [{
      id: mission.topicId,
      name: mission.topicName,
      description: mission.lessonText,
      subtopics: [],
      difficulty: mission.difficulty === "hard" ? "advanced" : mission.difficulty === "easy" ? "beginner" : "intermediate",
      estimatedHours: 1,
    }],
    subject: mission.subject,
    learningObjectives: [mission.topicName],
    checkpointQuestions: [],
    isCompleted: false,
  };
  const nextQuestions = selectMissionQuestions({
    pool,
    task: targetedTask,
    history,
    count: Math.max(3, mission.currentQuestionIds.length),
    attemptNumber: mission.attemptNumber + 1,
    excludedQuestionIds: [...excluded],
    difficulty: mission.difficulty === "hard" ? "medium" : "easy",
  });
  // If the bank is too small to provide new questions, reuse a focused set rather than blocking study.
  const fallback = nextQuestions.length >= 3 ? nextQuestions : selectMissionQuestions({
    pool,
    task: targetedTask,
    history,
    count: Math.max(3, mission.currentQuestionIds.length),
    attemptNumber: mission.attemptNumber + 1,
    difficulty: "easy",
  });
  return {
    ...mission,
    stage: "quiz",
    attemptNumber: mission.attemptNumber + 1,
    currentQuestionIds: fallback.map((question) => question.id),
    currentAnswers: [],
    updatedAt: new Date().toISOString(),
  };
}

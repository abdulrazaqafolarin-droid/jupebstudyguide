export type JambMissionSubject = "physics" | "chemistry" | "biology";
export type JambMissionStatus = "in_progress" | "completed";

export interface JambMissionAnswer {
  selectedOption: string;
  checked: boolean;
  gradable: boolean;
  isCorrect: boolean | null;
  checkedAt: string | null;
  correctOption?: string | null;
  explanation?: string | null;
}

export interface JambDailyMissionRecord {
  id: string;
  localDate: string;
  subject: JambMissionSubject;
  questionIds: string[];
  answers: Record<string, JambMissionAnswer>;
  status: JambMissionStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface JambMissionSummary {
  totalQuestions: number;
  answeredQuestions: number;
  checkedQuestions: number;
  gradableQuestions: number;
  correctAnswers: number;
  ungradedQuestions: number;
  accuracy: number | null;
  complete: boolean;
}

export function jambLocalDateKey(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function createJambDailyMission(
  localDate: string,
  subject: JambMissionSubject,
  questionIds: string[],
  now = new Date(),
): JambDailyMissionRecord | null {
  const uniqueIds = [...new Set(questionIds.filter((id) => typeof id === "string" && id.trim().length > 0))];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate) || uniqueIds.length < 3) return null;

  const timestamp = now.toISOString();
  return {
    id: `jamb-daily-${localDate}-${subject}`,
    localDate,
    subject,
    questionIds: uniqueIds,
    answers: {},
    status: "in_progress",
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
  };
}

export function selectJambMissionAnswer(
  mission: JambDailyMissionRecord,
  questionId: string,
  selectedOption: string,
  now = new Date(),
): JambDailyMissionRecord {
  if (!mission.questionIds.includes(questionId) || !/^[A-E]$/.test(selectedOption.trim().toUpperCase())) {
    return mission;
  }

  const next: JambDailyMissionRecord = {
    ...mission,
    answers: {
      ...mission.answers,
      [questionId]: {
        selectedOption: selectedOption.trim().toUpperCase(),
        checked: false,
        gradable: false,
        isCorrect: null,
        checkedAt: null,
      },
    },
    status: "in_progress",
    completedAt: null,
    updatedAt: now.toISOString(),
  };
  return next;
}

export function applyJambMissionAnswerCheck(
  mission: JambDailyMissionRecord,
  questionId: string,
  result: { gradable: boolean; isCorrect?: boolean; correctOption?: string | null; explanation?: string | null },
  now = new Date(),
): JambDailyMissionRecord {
  const existing = mission.answers[questionId];
  if (!mission.questionIds.includes(questionId) || !existing?.selectedOption) return mission;

  const answers = {
    ...mission.answers,
    [questionId]: {
      ...existing,
      checked: true,
      gradable: result.gradable,
      isCorrect: result.gradable ? result.isCorrect === true : null,
      correctOption: result.gradable ? result.correctOption ?? null : null,
      explanation: result.gradable ? result.explanation ?? null : null,
      checkedAt: now.toISOString(),
    },
  };
  const complete = mission.questionIds.every((id) => answers[id]?.checked === true);
  return {
    ...mission,
    answers,
    status: complete ? "completed" : "in_progress",
    completedAt: complete ? now.toISOString() : null,
    updatedAt: now.toISOString(),
  };
}

export function getJambMissionSummary(mission: JambDailyMissionRecord): JambMissionSummary {
  const answers = mission.questionIds.map((id) => mission.answers[id]).filter(Boolean);
  const checked = answers.filter((answer) => answer.checked);
  const gradable = checked.filter((answer) => answer.gradable);
  const correct = gradable.filter((answer) => answer.isCorrect === true).length;
  return {
    totalQuestions: mission.questionIds.length,
    answeredQuestions: answers.filter((answer) => Boolean(answer.selectedOption)).length,
    checkedQuestions: checked.length,
    gradableQuestions: gradable.length,
    correctAnswers: correct,
    ungradedQuestions: checked.filter((answer) => !answer.gradable).length,
    accuracy: gradable.length > 0 ? Math.round((correct / gradable.length) * 100) : null,
    complete: mission.status === "completed",
  };
}

export function mergeJambMissionHistory(
  local: JambDailyMissionRecord[],
  remote: JambDailyMissionRecord[],
): JambDailyMissionRecord[] {
  const byId = new Map<string, JambDailyMissionRecord>();
  for (const mission of [...remote, ...local]) {
    if (!mission?.id || !mission.localDate || !Array.isArray(mission.questionIds)) continue;
    const existing = byId.get(mission.id);
    const nextTime = Date.parse(mission.updatedAt);
    const currentTime = existing ? Date.parse(existing.updatedAt) : Number.NEGATIVE_INFINITY;
    if (!existing || (Number.isFinite(nextTime) ? nextTime : 0) >= (Number.isFinite(currentTime) ? currentTime : 0)) {
      byId.set(mission.id, mission);
    }
  }
  return [...byId.values()].sort((a, b) =>
    a.localDate.localeCompare(b.localDate) || a.subject.localeCompare(b.subject),
  );
}

export function getJambMissionQuestionOffset(
  localDate: string,
  subject: JambMissionSubject,
  questionCount: number,
  pageSize = 10,
): number {
  if (questionCount <= 0) return 0;
  const safePageSize = Math.min(Math.max(1, pageSize), questionCount);
  const maximumOffset = Math.max(0, questionCount - safePageSize);
  const dateSeed = Number(localDate.replace(/-/g, "")) || 0;
  const subjectOffset = subject === "physics" ? 0 : subject === "chemistry" ? 37 : 73;
  return maximumOffset === 0 ? 0 : (dateSeed + subjectOffset) % (maximumOffset + 1);
}

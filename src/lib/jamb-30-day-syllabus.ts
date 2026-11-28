import {
  JAMB_SYLLABUS,
  JAMB_SYLLABUS_SUBJECTS,
  type JambSyllabusSubjectId,
} from "@/lib/jamb-syllabus";

export const JAMB_PLAN_DAYS = 30;
export const JAMB_PLAN_SUBJECTS = JAMB_SYLLABUS_SUBJECTS;
export type JambPlanSubject = JambSyllabusSubjectId;
export type JambPlanStatus = "active" | "paused" | "completed";

export interface JambPlanTopic {
  id: string;
  number: string;
  title: string;
  sectionTitle: string;
  subject: JambPlanSubject;
  outline: string[];
  objectives: string[];
  sourcePages: number[];
}

export interface JambDailyTask {
  day: number;
  subject: JambPlanSubject;
  topics: JambPlanTopic[];
  learningObjectives: string[];
  checkpointQuestions: string[];
  isCompleted: boolean;
  completedAt?: string;
  masteryScore?: number;
}

export interface JambStudyProgress {
  subjects: JambPlanSubject[];
  currentDay: number;
  dailyTasks: JambDailyTask[];
  startedAt: string;
  lastStudiedAt?: string;
  overallProgress: number;
  subjectProgress: Record<JambPlanSubject, number>;
}

export interface JambStudySession {
  id: string;
  name: string;
  subjects: JambPlanSubject[];
  status: JambPlanStatus;
  progress: JambStudyProgress;
  startDate: string;
  dailyGoalMinutes: number;
  createdAt: string;
  updatedAt: string;
}

const SUBJECT_ORDER = JAMB_SYLLABUS_SUBJECTS;

export function normalizeJambPlanSubjects(subjects: readonly JambPlanSubject[]): JambPlanSubject[] {
  const unique = new Set(subjects);
  const selected = SUBJECT_ORDER.filter((subject) => unique.has(subject));
  if (!selected.includes("use_of_english")) selected.unshift("use_of_english");
  return selected;
}

function toPlanTopic(
  subject: JambPlanSubject,
  sectionTitle: string,
  topic: (typeof JAMB_SYLLABUS)[JambPlanSubject]["sections"][number]["topics"][number],
): JambPlanTopic {
  const outlines = topic.outline.filter(Boolean);
  return {
    id: topic.id,
    number: topic.number,
    title: topic.title,
    sectionTitle,
    subject,
    outline: outlines,
    objectives: topic.objectives?.filter(Boolean) ?? [],
    sourcePages: [...topic.sourcePages],
  };
}

export function getJambPlanTopicPool(subjects: readonly JambPlanSubject[]): JambPlanTopic[] {
  const selected = normalizeJambPlanSubjects(subjects);
  return selected.flatMap((subject) =>
    JAMB_SYLLABUS[subject].sections.flatMap((section) =>
      section.topics.map((topic) => toPlanTopic(subject, section.title, topic)),
    ),
  );
}

function buildLearningObjectives(topics: JambPlanTopic[]): string[] {
  return topics.flatMap((topic) => {
    const sourceObjectives = topic.objectives.length > 0
      ? topic.objectives.slice(0, 3)
      : topic.outline.slice(0, 2).map((outline) => `Understand ${outline}`);
    return [`Understand the key ideas in ${topic.title}`, ...sourceObjectives];
  });
}

function buildCheckpoints(topics: JambPlanTopic[]): string[] {
  return topics.flatMap((topic) => [
    `Can you explain ${topic.title} in your own words?`,
    topic.outline[0]
      ? `What should you know about ${topic.outline[0]}?`
      : `What are the important JAMB points in ${topic.title}?`,
  ]);
}

/**
 * Split the selected JAMB syllabus topics across exactly 30 study days.
 * The original subject/topic records are retained so AI tutor links can open
 * the correct JAMB topic and its own reviewed source outline.
 */
export function generateJamb30DayTasks(
  subjects: readonly JambPlanSubject[],
  totalDays = JAMB_PLAN_DAYS,
): JambDailyTask[] {
  if (!Number.isInteger(totalDays) || totalDays < 1 || totalDays > 120) {
    throw new RangeError("Study plan length must be between 1 and 120 days.");
  }
  const selected = normalizeJambPlanSubjects(subjects);
  if (selected.length !== 4 || !selected.includes("use_of_english")) {
    throw new Error("A JAMB study plan must contain Use of English and exactly three other subjects.");
  }

  const pool = getJambPlanTopicPool(selected);
  if (pool.length === 0) throw new Error("No JAMB syllabus topics are available for the selected subjects.");

  const tasks: JambDailyTask[] = [];
  for (let day = 1; day <= totalDays; day += 1) {
    const start = Math.floor(((day - 1) * pool.length) / totalDays);
    const end = Math.floor((day * pool.length) / totalDays);
    const topics = pool.slice(start, end);
    const subject = topics[0]?.subject ?? selected[(day - 1) % selected.length];
    tasks.push({
      day,
      subject,
      topics,
      learningObjectives: topics.length > 0
        ? buildLearningObjectives(topics)
        : ["Review previous topics", "Practise JAMB past questions", "Strengthen weak areas"],
      checkpointQuestions: topics.length > 0
        ? buildCheckpoints(topics)
        : ["Can you answer questions from the topics covered this week?"],
      isCompleted: false,
    });
  }
  return tasks;
}

export function getJambStudySessionProgress(tasks: readonly JambDailyTask[]) {
  const completed = tasks.filter((task) => task.isCompleted).length;
  return {
    completedDays: completed,
    totalDays: tasks.length,
    percentage: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
  };
}

export function mergeJambStudySessions(
  localSessions: JambStudySession[],
  cloudSessions: JambStudySession[],
): JambStudySession[] {
  const byId = new Map<string, JambStudySession>();
  for (const session of cloudSessions) {
    if (session?.id) byId.set(session.id, session);
  }
  for (const session of localSessions) {
    if (!session?.id) continue;
    const cloud = byId.get(session.id);
    if (!cloud) {
      byId.set(session.id, session);
      continue;
    }

    const localIsNewer = Date.parse(session.updatedAt) >= Date.parse(cloud.updatedAt);
    const preferred = localIsNewer ? session : cloud;
    const older = localIsNewer ? cloud : session;
    const olderByDay = new Map(older.progress.dailyTasks.map((task) => [task.day, task]));
    const tasks = preferred.progress.dailyTasks.map((task) => {
      const other = olderByDay.get(task.day);
      if (!other || (!task.isCompleted && !other.isCompleted)) return task;
      const completed = task.isCompleted ? task : other;
      return {
        ...task,
        isCompleted: true,
        completedAt: completed.completedAt,
        masteryScore: Math.max(task.masteryScore ?? 0, other.masteryScore ?? 0) || undefined,
      };
    });
    const completedDays = tasks.filter((task) => task.isCompleted).length;
    const progress: JambStudyProgress = {
      ...preferred.progress,
      dailyTasks: tasks,
      currentDay: Math.max(session.progress.currentDay, cloud.progress.currentDay),
      overallProgress: tasks.length ? (completedDays / tasks.length) * 100 : 0,
      subjectProgress: { ...older.progress.subjectProgress, ...preferred.progress.subjectProgress },
      lastStudiedAt: [session.progress.lastStudiedAt, cloud.progress.lastStudiedAt]
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1),
    };
    byId.set(session.id, {
      ...preferred,
      status: completedDays >= tasks.length && tasks.length > 0 ? "completed" : preferred.status,
      progress,
      createdAt: Date.parse(session.createdAt) <= Date.parse(cloud.createdAt) ? session.createdAt : cloud.createdAt,
      updatedAt: localIsNewer ? session.updatedAt : cloud.updatedAt,
    });
  }
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isValidPlanTopic(value: unknown): value is JambPlanTopic {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && value.id.length > 0
    && typeof value.number === "string"
    && typeof value.title === "string" && value.title.length > 0
    && typeof value.sectionTitle === "string"
    && typeof value.subject === "string" && SUBJECT_ORDER.includes(value.subject as JambPlanSubject)
    && Array.isArray(value.outline) && value.outline.every((item) => typeof item === "string")
    && Array.isArray(value.objectives) && value.objectives.every((item) => typeof item === "string")
    && Array.isArray(value.sourcePages) && value.sourcePages.every((page) => Number.isInteger(page) && page > 0);
}

/** Validate remote JSON before it is rendered or merged into local study progress. */
export function isJambStudySession(value: unknown): value is JambStudySession {
  if (!isRecord(value) || !isRecord(value.progress)) return false;
  const session = value;
  const progress = session.progress;
  const subjects = session.subjects;
  if (
    typeof session.id !== "string" || !session.id ||
    typeof session.name !== "string" ||
    !Array.isArray(subjects) ||
    subjects.length !== 4 ||
    !subjects.every((subject) => typeof subject === "string" && SUBJECT_ORDER.includes(subject as JambPlanSubject)) ||
    new Set(subjects).size !== 4 ||
    !subjects.includes("use_of_english") ||
    !["active", "paused", "completed"].includes(String(session.status)) ||
    typeof session.startDate !== "string" || !Number.isFinite(Date.parse(session.startDate)) ||
    typeof session.createdAt !== "string" || !Number.isFinite(Date.parse(session.createdAt)) ||
    typeof session.updatedAt !== "string" || !Number.isFinite(Date.parse(session.updatedAt)) ||
    typeof session.dailyGoalMinutes !== "number" ||
    !Number.isFinite(session.dailyGoalMinutes) || session.dailyGoalMinutes < 5 || session.dailyGoalMinutes > 480 ||
    !Array.isArray(progress.subjects) ||
    progress.subjects.length !== 4 ||
    !progress.subjects.every((subject) => typeof subject === "string" && SUBJECT_ORDER.includes(subject as JambPlanSubject)) ||
    !progress.subjects.includes("use_of_english") ||
    !Number.isInteger(progress.currentDay) || Number(progress.currentDay) < 1 || Number(progress.currentDay) > JAMB_PLAN_DAYS ||
    typeof progress.startedAt !== "string" || !Number.isFinite(Date.parse(progress.startedAt)) ||
    (progress.lastStudiedAt !== undefined && (typeof progress.lastStudiedAt !== "string" || !Number.isFinite(Date.parse(progress.lastStudiedAt)))) ||
    typeof progress.overallProgress !== "number" || !Number.isFinite(progress.overallProgress) || progress.overallProgress < 0 || progress.overallProgress > 100 ||
    !isRecord(progress.subjectProgress) ||
    !SUBJECT_ORDER.every((subject) => typeof progress.subjectProgress[subject] === "number" &&
      Number.isFinite(progress.subjectProgress[subject]) &&
      Number(progress.subjectProgress[subject]) >= 0 &&
      Number(progress.subjectProgress[subject]) <= 100) ||
    !Array.isArray(progress.dailyTasks) ||
    progress.dailyTasks.length !== JAMB_PLAN_DAYS
  ) return false;

  return progress.dailyTasks.every((task, index) =>
    isRecord(task) &&
    Number.isInteger(task.day) && task.day === index + 1 &&
    typeof task.subject === "string" && SUBJECT_ORDER.includes(task.subject as JambPlanSubject) &&
    Array.isArray(task.topics) && task.topics.every(isValidPlanTopic) &&
    Array.isArray(task.learningObjectives) && task.learningObjectives.every((item) => typeof item === "string") &&
    Array.isArray(task.checkpointQuestions) && task.checkpointQuestions.every((item) => typeof item === "string") &&
    typeof task.isCompleted === "boolean" &&
    (task.completedAt === undefined || (typeof task.completedAt === "string" && Number.isFinite(Date.parse(task.completedAt)))) &&
    (task.masteryScore === undefined || (typeof task.masteryScore === "number" &&
      Number.isFinite(task.masteryScore) && task.masteryScore >= 0 && task.masteryScore <= 100))
  );
}

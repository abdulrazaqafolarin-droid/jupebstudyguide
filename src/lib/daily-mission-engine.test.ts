import { describe, expect, it } from "vitest";
import type { Question } from "@/types/question";
import type { DailyTask, StudySessionData } from "@/types/syllabus";
import {
  createDailyMission,
  prepareRecoveryAttempt,
  submitMissionAttempt,
  type DailyMissionRecord,
} from "./daily-mission-engine";

const question = (id: string, topic = "Motion"): Question => ({
  id,
  subject: "physics",
  year: 2025,
  type: "mcq",
  topic,
  question: `Question about ${topic} ${id}?`,
  options: [
    { label: "A", text: "Option A" },
    { label: "B", text: "Option B" },
    { label: "C", text: "Option C" },
    { label: "D", text: "Option D" },
  ],
  correctAnswer: "A",
  explanation: "Check the core definition and apply it to the example.",
  difficulty: "medium",
});

const task: DailyTask = {
  day: 1,
  subject: "physics",
  topics: [{
    id: "motion",
    name: "Motion",
    description: "Describe movement and its measurement.",
    subtopics: ["Distance", "Displacement", "Speed"],
    difficulty: "beginner",
    estimatedHours: 2,
  }],
  learningObjectives: ["Distinguish distance from displacement."],
  checkpointQuestions: ["What is displacement?"],
  isCompleted: false,
};

const session: StudySessionData = {
  id: "session-1",
  name: "Physics Plan",
  subjects: ["physics", "chemistry"],
  status: "active",
  progress: {
    combination: { core: ["physics", "chemistry"], elective: [] },
    currentDay: 1,
    dailyTasks: [task],
    startedAt: new Date("2026-10-14T00:00:00.000Z"),
    overallProgress: 0,
    subjectProgress: { physics: 0, chemistry: 0, biology: 0, math: 0 },
  },
  startDate: "2026-10-14",
  dailyGoalMinutes: 30,
  createdAt: "2026-10-14T00:00:00.000Z",
  updatedAt: "2026-10-14T00:00:00.000Z",
};

function missionFixture(): DailyMissionRecord {
  const questions = [question("q1"), question("q2"), question("q3")];
  return {
    id: "mission-2026-10-14-session-1",
    localDate: "2026-10-14",
    sessionId: "session-1",
    syllabusDay: 1,
    subject: "physics",
    topicId: "motion",
    topicName: "Motion",
    lessonTitle: "Motion",
    lessonText: "Motion describes change in position over time.",
    stage: "quiz",
    attemptNumber: 1,
    currentQuestionIds: questions.map((q) => q.id),
    currentAnswers: [],
    attempts: [],
    bestAccuracy: null,
    mistakeQuestionIds: [],
    difficulty: "medium",
    createdAt: "2026-10-14T00:00:00.000Z",
    updatedAt: "2026-10-14T00:00:00.000Z",
  };
}

describe("daily mission engine", () => {
  it("builds a syllabus-guided lesson and selects gradable topic questions", () => {
    const pool = [
      ...Array.from({ length: 11 }, (_, index) => question(`q${index + 1}`)),
      question("q12", "Waves"),
    ];
    const mission = createDailyMission({
      session,
      task,
      questions: pool,
      history: [],
      localDate: "2026-10-14",
      now: new Date("2026-10-14T10:00:00.000Z"),
    });
    expect(mission?.topicName).toBe("Motion");
    expect(mission?.stage).toBe("lesson");
    expect(mission?.currentQuestionIds).toHaveLength(10);
    expect(mission?.currentQuestionIds).not.toContain("q12");
  });

  it("includes previous mistakes from another subject in the mixed daily set", () => {
    const previous = {
      ...missionFixture(),
      localDate: "2026-10-13",
      mistakeQuestionIds: ["bio1"],
    };
    const pool = [
      ...Array.from({ length: 11 }, (_, index) => question(`q${index + 1}`)),
      { ...question("bio1", "Cell Structure"), subject: "biology" as const },
    ];
    const mission = createDailyMission({
      session,
      task,
      questions: pool,
      history: [previous],
      localDate: "2026-10-14",
      now: new Date("2026-10-14T10:00:00.000Z"),
    });
    expect(mission?.currentQuestionIds).toContain("bio1");
  });

  it("does not create a second mission for the same local date", () => {
    const existing = missionFixture();
    expect(createDailyMission({
      session,
      task,
      questions: [question("q1"), question("q2"), question("q3")],
      history: [existing],
      localDate: "2026-10-14",
    })).toBeNull();
  });

  it("moves below-target accuracy into recovery and records mistakes", () => {
    const mission = missionFixture();
    const pool = mission.currentQuestionIds.map((id) => question(id));
    const result = submitMissionAttempt(mission, pool, [
      { questionId: "q1", selectedAnswer: "A", isCorrect: true },
      { questionId: "q2", selectedAnswer: "B", isCorrect: false },
      { questionId: "q3", selectedAnswer: "B", isCorrect: false },
    ]);
    expect(result.stage).toBe("recovery");
    expect(result.attempts[0].accuracy).toBe(33);
    expect(result.mistakeQuestionIds).toEqual(["q2", "q3"]);
  });

  it("completes at exactly 70% accuracy", () => {
    const mission = missionFixture();
    const questionIds = Array.from({ length: 10 }, (_, index) => `q${index + 1}`);
    const tenQuestionMission = { ...mission, currentQuestionIds: questionIds };
    const pool = questionIds.map((id) => question(id));
    const answers = questionIds.map((questionId, index) => ({
      questionId,
      selectedAnswer: index < 7 ? "A" : "B",
      isCorrect: index < 7,
    }));
    const result = submitMissionAttempt(tenQuestionMission, pool, answers);
    expect(result.stage).toBe("completed");
    expect(result.attempts[0].accuracy).toBe(70);
  });

  it("uses a fresh targeted set when enough questions exist", () => {
    const mission = missionFixture();
    const pool = ["q1", "q2", "q3", "q4", "q5", "q6"].map((id) => question(id));
    const failed = submitMissionAttempt(mission, pool, [
      { questionId: "q1", selectedAnswer: "B", isCorrect: false },
      { questionId: "q2", selectedAnswer: "B", isCorrect: false },
      { questionId: "q3", selectedAnswer: "B", isCorrect: false },
    ]);
    const retry = prepareRecoveryAttempt(failed, pool, [failed]);
    expect(retry.stage).toBe("quiz");
    expect(retry.attemptNumber).toBe(2);
    expect(retry.currentQuestionIds.every((id) => !["q1", "q2", "q3"].includes(id))).toBe(true);
  });
});

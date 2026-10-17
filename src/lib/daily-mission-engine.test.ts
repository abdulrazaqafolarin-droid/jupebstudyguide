import { describe, expect, it, vi } from "vitest";
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

  it("excludes previous mistakes from other subjects and off-day topics", () => {
    const previous = {
      ...missionFixture(),
      localDate: "2026-10-13",
      mistakeQuestionIds: ["bio1", "opt1"],
    };
    const pool = [
      ...Array.from({ length: 11 }, (_, index) => question(`q${index + 1}`)),
      { ...question("bio1", "Cell Structure"), subject: "biology" as const },
      question("opt1", "Geometrical Optics"),
    ];
    const mission = createDailyMission({
      session,
      task,
      questions: pool,
      history: [previous],
      localDate: "2026-10-14",
      now: new Date("2026-10-14T10:00:00.000Z"),
    });
    // Neither the cross-subject mistake nor the off-topic mistake may leak in,
    // even though mistakes used to outrank topic matches.
    expect(mission?.currentQuestionIds).not.toContain("bio1");
    expect(mission?.currentQuestionIds).not.toContain("opt1");
    expect(mission?.currentQuestionIds).toHaveLength(10);
  });

  it("keeps every question inside the day's shown topics and subject", () => {
    const twoTopicTask: DailyTask = {
      ...task,
      topics: [
        task.topics[0],
        {
          id: "waves",
          name: "Waves",
          description: "Wave properties and behaviour.",
          subtopics: ["Frequency", "Wavelength"],
          difficulty: "intermediate",
          estimatedHours: 2,
        },
      ],
    };
    const pool = [
      ...Array.from({ length: 5 }, (_, index) => question(`m${index + 1}`, "Motion")),
      ...Array.from({ length: 5 }, (_, index) => question(`w${index + 1}`, "Waves")),
      question("off1", "Geometrical Optics"),
      { ...question("bio9", "Motion"), subject: "biology" as const },
    ];
    const byId = new Map(pool.map((q) => [q.id, q]));
    const mission = createDailyMission({
      session,
      task: twoTopicTask,
      questions: pool,
      history: [],
      localDate: "2026-10-14",
      now: new Date("2026-10-14T10:00:00.000Z"),
    });
    expect(mission?.currentQuestionIds.length).toBeGreaterThanOrEqual(3);
    for (const id of mission?.currentQuestionIds ?? []) {
      const q = byId.get(id)!;
      expect(q.subject).toBe("physics");
      expect(["Motion", "Waves"]).toContain(q.topic);
    }
    expect(mission?.currentQuestionIds).not.toContain("off1");
    expect(mission?.currentQuestionIds).not.toContain("bio9");
  });

  it("spotlights a random topic from the day's set as the lesson focus", () => {
    const twoTopicTask: DailyTask = {
      ...task,
      topics: [
        task.topics[0],
        {
          id: "waves",
          name: "Waves",
          description: "Wave properties and behaviour.",
          subtopics: ["Frequency"],
          difficulty: "intermediate",
          estimatedHours: 2,
        },
      ],
    };
    const pool = [
      ...Array.from({ length: 5 }, (_, index) => question(`m${index + 1}`, "Motion")),
      ...Array.from({ length: 5 }, (_, index) => question(`w${index + 1}`, "Waves")),
    ];
    const random = vi.spyOn(Math, "random").mockReturnValue(0.99);
    try {
      const mission = createDailyMission({
        session,
        task: twoTopicTask,
        questions: pool,
        history: [],
        localDate: "2026-10-14",
        now: new Date("2026-10-14T10:00:00.000Z"),
      });
      expect(mission?.topicId).toBe("waves");
      expect(mission?.topicName).toBe("Waves");
      expect(mission?.lessonTitle).toBe("Waves");
    } finally {
      random.mockRestore();
    }
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

  it("matches coarse course slugs (e.g. phy-mechanics) to fine syllabus topics", () => {
    const dynamicsTask: DailyTask = {
      day: 2,
      subject: "physics",
      topics: [{
        id: "phy-dynamics",
        name: "Dynamics",
        description: "Newton's laws, forces, equilibrium, momentum, collisions",
        subtopics: ["Newton's Laws of Motion", "Equilibrium of Forces"],
        difficulty: "intermediate",
        estimatedHours: 5,
      }],
      learningObjectives: ["Understand Newton's laws."],
      checkpointQuestions: ["State the three laws."],
      isCompleted: false,
    };
    const pool = [
      // Course-slug questions: the bank tags them under the broad course
      // "phy-mechanics", which must still map to the syllabus topic Dynamics.
      ...Array.from({ length: 10 }, (_, i) => question(`mech${i + 1}`, "phy-mechanics")),
      // Off-topic slug: waves questions must never appear under Dynamics.
      question("wave1", "phy-waves"),
      // Off-topic slug from another chapter of the same subject.
      question("opt1", "phy-optics"),
    ];
    const mission = createDailyMission({
      session,
      task: dynamicsTask,
      questions: pool,
      history: [],
      localDate: "2026-10-15",
      now: new Date("2026-10-15T10:00:00.000Z"),
    });
    expect(mission).not.toBeNull();
    expect(mission!.currentQuestionIds).toHaveLength(10);
    expect(mission!.currentQuestionIds).toContain("mech1");
    expect(mission!.currentQuestionIds).not.toContain("wave1");
    expect(mission!.currentQuestionIds).not.toContain("opt1");
  });

  it("matches messy human-typed course labels via substring lookup", () => {
    const organicTask: DailyTask = {
      day: 3,
      subject: "chemistry",
      topics: [{
        id: "chm-hydrocarbons",
        name: "Hydrocarbons",
        description: "Alkanes, alkenes, alkynes and their reactions",
        subtopics: ["Alkanes/Alkenes/Alkynes"],
        difficulty: "advanced",
        estimatedHours: 6,
      }],
      learningObjectives: ["Distinguish alkane reactions."],
      checkpointQuestions: ["What is cracking?"],
      isCompleted: false,
    };
    const labels = ["Chm- organic chem", "chm-organic", "Chm- organic", "Chm- organic chm"];
    const pool = [
      // Variants that appear in the real bank data — all must resolve to the
      // organic course slug and therefore to the Hydrocarbons syllabus topic.
      ...labels.map((label, i) => ({ ...question(`org${i + 1}`, label), subject: "chemistry" as const })),
      ...Array.from({ length: 7 }, (_, i) => ({
        ...question(`orgx${i + 1}`, "Chm- organic"),
        subject: "chemistry" as const,
      })),
      // Off-topic slug: bonding questions must not displace topical ones.
      { ...question("bond1", "chm-chemical-bonding"), subject: "chemistry" as const },
    ];
    const mission = createDailyMission({
      session,
      task: organicTask,
      questions: pool,
      history: [],
      localDate: "2026-10-16",
      now: new Date("2026-10-16T10:00:00.000Z"),
    });
    expect(mission).not.toBeNull();
    const ids = mission!.currentQuestionIds;
    expect(ids).toHaveLength(10);
    expect(ids).toContain("org1");
    expect(ids).toContain("org2");
    expect(ids).toContain("org3");
    expect(ids).toContain("org4");
    expect(ids).not.toContain("bond1");
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

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

/**
 * The question bank stores `course` as coarse-grained slugs (e.g. `phy-mechanics`,
 * `chm-organic`) while the syllabus uses fine-grained topic IDs (e.g. `phy-dynamics`,
 * `chm-hydrocarbons`).  This map bridges the two so that questions tagged with a
 * course slug match every syllabus topic that falls under that slug.
 *
 * Keys must match the raw `course` value (case-insensitive) after normalisation.
 */
const COURSE_TOPIC_MAP: Record<string, readonly string[]> = {
  // ── Physics ──────────────────────────────────────────────────────────
  "phy mechanics": [
    "phy-kinematics", "phy-dynamics", "phy-gravity", "phy-work-energy",
    "phy-circular", "phy-elasticity", "phy-hydrostatics",
  ],
  "phy modern physics": [
    "phy-atomic", "phy-modern", "phy-xrays", "phy-quantum",
    "phy-radioactivity", "phy-semiconductors", "phy-em-waves",
  ],
  "phy electricity": [
    "phy-electrostatics", "phy-capacitors", "phy-current",
    "phy-magnetism", "phy-force-conductor", "phy-induction", "phy-ac",
  ],
  "phy thermodynamics": [
    "phy-temperature", "phy-thermodynamics", "phy-gases",
  ],
  "phy waves": ["phy-waves", "phy-sound", "phy-wave-light"],
  "phy optics": ["phy-geometrical-optics"],
  "phy magnetism": ["phy-magnetism", "phy-force-conductor", "phy-induction"],
  "phy nuclear": ["phy-radioactivity"],
  // ── Chemistry ────────────────────────────────────────────────────────
  "chm organic": [
    "chm-organic-structure", "chm-organic-reactions", "chm-isomerism",
    "chm-hydrocarbons", "chm-macromolecules", "chm-petroleum",
  ],
  "chm organic chem": [
    "chm-organic-structure", "chm-organic-reactions", "chm-isomerism",
    "chm-hydrocarbons",
  ],
  "chm organic chm": [
    "chm-organic-structure", "chm-organic-reactions", "chm-isomerism",
    "chm-hydrocarbons",
  ],
  "chm chemical bonding": ["chm-bonding"],
  "chm periodic table": ["chm-periodicity", "chm-periodicity-advanced"],
  "chm atomic structure": ["chm-atomic"],
  "chm equilibrium": ["chm-equilibrium"],
  "chm chemical equilibrium": ["chm-equilibrium"],
  "chm gas laws": ["chm-gases"],
  "chm redox": ["chm-reactions", "chm-electrochemistry"],
  "chm kinetics": ["chm-kinetics"],
  "chm chemical kinetics": ["chm-kinetics"],
  "chm thermochemistry": ["chm-thermochemistry", "chm-thermodynamics"],
  "chm thermodynamics": ["chm-thermodynamics", "chm-thermochemistry"],
  "chm nuclear": ["chm-nuclear"],
  "chm electrochemistry": ["chm-electrochemistry"],
  "chm inorganic": ["chm-dblock", "chm-pblock", "chm-periodicity-advanced"],
  "chm coordination chemistry": ["chm-dblock"],
  "chm coordination number": ["chm-dblock"],
  "chm stochiometry": ["chm-mole"],
  "chm stoichiometry": ["chm-mole"],
  "chm mole concept": ["chm-mole"],
  "chm acid base": ["chm-equilibrium"],
  "chm acids bases": ["chm-equilibrium"],
  "chm isomerism": ["chm-isomerism"],
  "chm aromatic compounds": ["chm-hydrocarbons"],
  "chm electronic config": ["chm-atomic"],
  "chm mass spectrometer": ["chm-mole"],
  "chm kinetic theory of gases": ["chm-gases"],
  "chm state of matter": ["chm-matter"],
  "chm waves": ["chm-matter"],
  "chm homologous series": ["chm-organic-structure"],
  "chm separation technique": ["chm-separation"],
  "chm biotechnology": ["chm-nanochemistry"],
  "chm biochemistry": ["chm-macromolecules"],
  "chm industrial chem": ["chm-environment"],
  "chm metallurgy": ["chm-dblock"],
  // ── Chemistry: legacy raw `course` values found in the bank ────────────
  // Course-level JUPEB headers (grab-bag papers spanning several topics).
  "chm 001 general chemistry option a011": [
    "chm-measurement", "chm-matter", "chm-atomic", "chm-bonding", "chm-mole",
    "chm-equilibrium", "chm-reactions", "chm-gases", "chm-separation",
  ],
  "chm 001": [
    "chm-measurement", "chm-matter", "chm-atomic", "chm-bonding", "chm-mole",
    "chm-equilibrium", "chm-reactions", "chm-gases", "chm-separation",
  ],
  "chm 002 physical chemistry option a011": [
    "chm-mole", "chm-gases", "chm-equilibrium", "chm-thermochemistry",
    "chm-thermodynamics", "chm-kinetics", "chm-electrochemistry", "chm-atomic",
    "chm-bonding", "chm-nuclear",
  ],
  "chm 002": [
    "chm-mole", "chm-gases", "chm-equilibrium", "chm-thermochemistry",
    "chm-thermodynamics", "chm-kinetics", "chm-electrochemistry", "chm-atomic",
    "chm-bonding", "chm-nuclear",
  ],
  "chm 003 inorganic chemistry option a011": [
    "chm-periodicity", "chm-periodicity-advanced", "chm-pblock", "chm-dblock",
    "chm-atomic", "chm-bonding", "chm-reactions", "chm-nuclear",
  ],
  "chm 003": [
    "chm-periodicity", "chm-periodicity-advanced", "chm-pblock", "chm-dblock",
    "chm-atomic", "chm-bonding", "chm-reactions", "chm-nuclear",
  ],
  "chm 004 organic chemistry option a011": [
    "chm-organic-structure", "chm-organic-reactions", "chm-isomerism",
    "chm-hydrocarbons", "chm-macromolecules", "chm-petroleum",
  ],
  "chm 004": [
    "chm-organic-structure", "chm-organic-reactions", "chm-isomerism",
    "chm-hydrocarbons", "chm-macromolecules", "chm-petroleum",
  ],
  "chm general chemistry": [
    "chm-measurement", "chm-matter", "chm-atomic", "chm-bonding", "chm-mole",
    "chm-equilibrium", "chm-reactions", "chm-gases", "chm-separation",
  ],
  "chm physical chemistry": [
    "chm-mole", "chm-gases", "chm-equilibrium", "chm-thermochemistry",
    "chm-thermodynamics", "chm-kinetics", "chm-electrochemistry", "chm-atomic",
    "chm-bonding", "chm-nuclear",
  ],
  "chm physical chem": [
    "chm-mole", "chm-gases", "chm-equilibrium", "chm-thermochemistry",
    "chm-thermodynamics", "chm-kinetics", "chm-electrochemistry", "chm-atomic",
    "chm-bonding", "chm-nuclear",
  ],
  "chm inorganic chemistry": [
    "chm-periodicity", "chm-periodicity-advanced", "chm-pblock", "chm-dblock",
    "chm-atomic", "chm-bonding", "chm-reactions", "chm-nuclear",
  ],
  "chm organic chemistry": [
    "chm-organic-structure", "chm-organic-reactions", "chm-isomerism",
    "chm-hydrocarbons", "chm-macromolecules", "chm-petroleum",
  ],
  // Single-topic / narrow dialects
  "chm energetics": ["chm-thermochemistry", "chm-thermodynamics"],
  "chm quantitative": ["chm-mole", "chm-measurement"],
  "chm redox reactions": ["chm-reactions", "chm-electrochemistry"],
  "chm s block elements": ["chm-periodicity-advanced"],
  "chm solubility": ["chm-equilibrium", "chm-solutions"],
  "chm coordination chem": ["chm-dblock"],
  "chm coordination": ["chm-dblock"],
  "chm periodic trends": ["chm-periodicity", "chm-periodicity-advanced"],
  "chm acids and bases": ["chm-equilibrium"],
  "chm chemical reactions": ["chm-reactions"],
  "chm transition elements": ["chm-dblock"],
  "chm measurements": ["chm-measurement"],
  "chm amines": ["chm-hydrocarbons"],
  "chm trigonal planar": ["chm-bonding"],
  "chm nuclear chem": ["chm-nuclear"],
  "chm metallic bonding": ["chm-bonding"],
  "chm hybridization": ["chm-bonding"],
  "chm chm bonding": ["chm-bonding"],
  "chm chm equation": ["chm-reactions"],
  "chm oxidation number": ["chm-reactions"],
  "chm alkanes": ["chm-hydrocarbons"],
  "chm alkenes": ["chm-hydrocarbons"],
  "chm atomich structure": ["chm-atomic"],
  "alcohols": ["chm-hydrocarbons"],
  "mole concept": ["chm-mole"],
  "chemistry isomerism": ["chm-isomerism"],
  "thermodynamics state functions": ["chm-thermodynamics"],
  "thermochemistry standard state conditions": ["chm-thermochemistry"],
  "water chemistry hardness of water": ["chm-solutions", "chm-reactions"],
  "elements reactivity": ["chm-periodicity", "chm-periodicity-advanced"],
  "periodic table hydrogen": ["chm-periodicity-advanced"],
  "environmental chem": ["chm-environment"],
  // ── Biology ──────────────────────────────────────────────────────────
  "bio physiology": ["bio-physiology", "bio-transport"],
  "bio cell biology": ["bio-cells"],
  "bio genetics": ["bio-genetics"],
  "bio ecology": ["bio-ecology"],
  "bio biochemistry": ["bio-molecules"],
  "bio plant hormones": ["bio-growth-regulators"],
  "bio nutrition": ["bio-plant-nutrition", "bio-physiology"],
  "bio evidence of evolution": ["bio-evolution"],
  "bio mitosis": ["bio-genetics"],
  "bio immunity": ["bio-microbial-ecology"],
  "bio cnidarians": ["bio-animal-taxonomy"],
  "bio animal classification": ["bio-animal-taxonomy"],
  "bio protozoa": ["bio-micro-types"],
  "bio taxonomy": ["bio-taxonomy"],
  "bio food tests": ["bio-physiology"],
  "bio dna replication": ["bio-micro-nucleic"],
  "bio epithelial tissues": ["bio-transport"],
  "bio fermentation": ["bio-plant-respiration"],
  "bio transpiration": ["bio-plant-transport"],
  "bio bacterial disease": ["bio-micro-types"],
  "bio connective tissue": ["bio-transport"],
  "bio food preservation": ["bio-microbial-ecology"],
  "bio food science": ["bio-physiology"],
  "bio xerophytes": ["bio-plant-diversity"],
};

/**
 * Resolve a question's raw course/topic value to a set of syllabus topic IDs.
 *  1. Direct slug lookup (exact course value present in the map).
 *  2. Substring match — if the course value contains a known slug fragment
 *     (e.g. "Chm- organic chem" contains "chm organic"), use that entry.
 */
function resolveCourseTopicIds(rawTopic: string | undefined): readonly string[] {
  const key = normalize(rawTopic);
  if (!key) return [];
  // Exact match
  const direct = COURSE_TOPIC_MAP[key];
  if (direct) return direct;
  // Substring match: find the longest key that is contained in the value
  let best: readonly string[] = [];
  let bestLen = 0;
  for (const [mapKey, ids] of Object.entries(COURSE_TOPIC_MAP)) {
    if (key.includes(mapKey) && mapKey.length > bestLen) {
      best = ids;
      bestLen = mapKey.length;
    }
  }
  return best;
}

function topicMatches(question: Question, topics: DailyTask["topics"]): boolean {
  const qTopic = normalize(question.topic);
  if (!qTopic) return false;

  // 1. Check if the question's course maps to any of the syllabus topic IDs.
  const mappedIds = resolveCourseTopicIds(question.topic);
  if (mappedIds.length > 0 && topics.some((t) => mappedIds.includes(t.id))) return true;

  // 2. Check if the raw course value IS a syllabus topic ID (e.g. "phy-current").
  if (topics.some((t) => t.id === question.topic)) return true;

  // 3. Original name / subtopic matching (covers questions whose topic is a
  //    human-readable string that directly matches a syllabus topic name).
  return topics.some((topic) => {
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
  weakQuestionIds?: string[];
  difficulty?: Difficulty;
  /** Syllabus topic id the mission lesson focuses on — matched questions rank first. */
  focusTopicId?: string;
}): Question[] {
  const {
    pool,
    task,
    history,
    count = 10,
    attemptNumber = 1,
    excludedQuestionIds = [],
    preferredQuestionIds = [],
    weakQuestionIds = [],
    difficulty = "medium",
    focusTopicId,
  } = args;
  const excluded = new Set(excludedQuestionIds);
  const priorMistakes = new Set(history.flatMap((mission) => mission.mistakeQuestionIds));
  const weakQuestions = new Set(weakQuestionIds);
  const recentlySeen = new Set(history.slice(-2).flatMap((mission) => [
    ...mission.currentQuestionIds,
    ...mission.attempts.flatMap((attempt) => attempt.questionIds),
  ]));
  const uniquePool = [...new Map(pool.map((question) => [question.id, question])).values()];
  const gradable = uniquePool.filter((question) =>
    question.type === "mcq" &&
    (question.options?.length ?? 0) >= 2 &&
    hasGradableAnswer(question.correctAnswer) &&
    !excluded.has(question.id)
  );
  // Hard gate 1: never cross subjects — a physics mission never asks biology.
  const sameSubject = gradable.filter((question) => question.subject === task.subject);
  // Hard gate 2: the question's topic must be one of the topics shown for
  // the day (review days with no topics fall back to same-subject revision).
  const dayTopics = task.topics ?? [];
  const topical = dayTopics.length === 0
    ? sameSubject
    : sameSubject.filter((question) => topicMatches(question, dayTopics));
  const focusTopics = focusTopicId
    ? dayTopics.filter((topic) => topic.id === focusTopicId)
    : [];
  const score = (question: Question) => {
    let points = 0;
    if (preferredQuestionIds.includes(question.id)) points += 1000;
    if (priorMistakes.has(question.id)) points += 100;
    if (weakQuestions.has(question.id)) points += 80;
    if (focusTopics.length > 0 && topicMatches(question, focusTopics)) points += 40;
    if (questionDifficulty(question) === difficulty) points += 10;
    if (recentlySeen.has(question.id) && !priorMistakes.has(question.id)) points -= 25;
    if (attemptNumber > 1 && !excluded.has(question.id)) points += 1;
    return points;
  };
  const rank = (list: Question[]) =>
    [...list].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
  const ordered: Question[] = [];
  const picked = new Set<string>();
  const push = (question: Question) => {
    if (ordered.length >= count || picked.has(question.id)) return;
    picked.add(question.id);
    ordered.push(question);
  };
  // Reserve up to three slots for previous mistakes / weak spots — all
  // topic-aligned by construction, so review never smuggles in off-topic
  // questions the way the old +100/+80-vs-+60 scoring did.
  rank(topical)
    .filter((question) => priorMistakes.has(question.id) || weakQuestions.has(question.id))
    .slice(0, Math.min(3, count))
    .forEach(push);
  rank(topical).forEach(push);
  // Thin bank fallback: top up from the same subject only. Topic-matched
  // questions always come first; cross-subject questions never qualify.
  if (ordered.length < count) {
    const topicalIds = new Set(topical.map((question) => question.id));
    rank(sameSubject.filter((question) => !topicalIds.has(question.id))).forEach(push);
  }
  return ordered.slice(0, count);
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
  weakQuestionIds?: string[];
  localDate: string;
  now?: Date;
}): DailyMissionRecord | null {
  const { session, task, questions, history, localDate } = args;
  if (history.some((mission) => mission.localDate === localDate)) return null;
  const previousAccuracies = history.flatMap((mission) => mission.attempts.map((attempt) => attempt.accuracy));
  const difficulty = chooseMissionDifficulty(previousAccuracies);
  // The lesson spotlights one random topic from the day's set (stable for
  // the day: missions are created once per localDate), and every question
  // is drawn from the topics shown — never an unrelated topic or subject.
  const focus = task.topics.length > 0
    ? task.topics[Math.floor(Math.random() * task.topics.length)]
    : undefined;
  const selected = selectMissionQuestions({
    pool: questions,
    task,
    history,
    weakQuestionIds: args.weakQuestionIds,
    difficulty,
    focusTopicId: focus?.id,
  });
  if (selected.length < 3) return null;
  const focusedTask = focus
    ? { ...task, topics: [focus, ...task.topics.filter((topic) => topic.id !== focus.id)] }
    : task;
  const lesson = buildMissionLesson(focusedTask);
  const now = (args.now ?? new Date()).toISOString();
  return {
    id: `mission-${localDate}-${session.id}`,
    localDate,
    sessionId: session.id,
    syllabusDay: task.day,
    subject: task.subject,
    topicId: focus?.id ?? `subject-${task.subject}`,
    topicName: focus?.name ?? task.learningObjectives[0] ?? task.subject,
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
  const missedTopics = pool
    .filter((question) => mission.mistakeQuestionIds.includes(question.id) && question.topic?.trim())
    .map((question) => question.topic!.trim())
    .filter((topic, index, all) => all.indexOf(topic) === index)
    .map((topic, index) => ({
      id: `missed-topic-${index}`,
      name: topic,
      description: `Review questions previously missed in ${topic}.`,
      subtopics: [],
      difficulty: mission.difficulty === "hard" ? "advanced" as const : mission.difficulty === "easy" ? "beginner" as const : "intermediate" as const,
      estimatedHours: 1,
    }));
  const targetedTask: DailyTask = {
    day: mission.syllabusDay,
    topics: [{
      id: mission.topicId,
      name: mission.topicName,
      description: mission.lessonText,
      subtopics: [],
      difficulty: mission.difficulty === "hard" ? "advanced" : mission.difficulty === "easy" ? "beginner" : "intermediate",
      estimatedHours: 1,
    }, ...missedTopics],
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
    focusTopicId: mission.topicId,
  });
  // If the bank is too small to provide new questions, reuse a focused set rather than blocking study.
  const fallback = nextQuestions.length >= 3 ? nextQuestions : selectMissionQuestions({
    pool,
    task: targetedTask,
    history,
    count: Math.max(3, mission.currentQuestionIds.length),
    attemptNumber: mission.attemptNumber + 1,
    difficulty: "easy",
    focusTopicId: mission.topicId,
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

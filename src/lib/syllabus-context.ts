import { SYLLABUSES, type SyllabusTopic } from '@/types/syllabus';
import type { Subject } from '@/types/question';
import { TUTOR_SYSTEM_PROMPT } from '@/lib/prompts';

const SUBJECT_LABELS: Record<Subject, string> = {
  physics: 'PHYSICS (Core Subject - Compulsory for all science students)',
  chemistry: 'CHEMISTRY (Core Subject - Compulsory for all science students)',
  biology: 'BIOLOGY (Elective - For students pursuing life sciences/medicine)',
  math: 'MATHEMATICS (Elective - For students pursuing physical sciences/engineering)',
};

export function getSyllabusContext(): string {
  let ctx = "\n\n=== COMPLETE JUPEB SYLLABUS REFERENCE ===\n";
  ctx += "You have COMPLETE knowledge of the entire JUPEB A-level syllabus. ";
  ctx += "Use this to guide students on what to study, show topic connections, ";
  ctx += "recommend study order, and explain where each topic fits in the broader curriculum.\n\n";

  for (const [subj, label] of Object.entries(SUBJECT_LABELS)) {
    const topics = SYLLABUSES[subj as Subject];
    if (!topics) continue;

    const totalHours = topics.reduce((sum, t) => sum + t.estimatedHours, 0);
    const beginner = topics.filter(t => t.difficulty === 'beginner').length;
    const intermediate = topics.filter(t => t.difficulty === 'intermediate').length;
    const advanced = topics.filter(t => t.difficulty === 'advanced').length;

    ctx += `--- ${label} ---\n`;
    ctx += `${topics.length} topics | ${totalHours}h estimated | ${beginner} beginner, ${intermediate} intermediate, ${advanced} advanced\n\n`;

    for (const topic of topics) {
      ctx += `  ${topic.id}: ${topic.name}\n`;
      ctx += `  ${topic.description}\n`;
      ctx += `  Difficulty: ${topic.difficulty} | Est. ${topic.estimatedHours}h | Subtopics: ${topic.subtopics.join(', ')}\n\n`;
    }
  }

  ctx += "=== END OF SYLLABUS REFERENCE ===\n";
  ctx += "IMPORTANT: When a student asks about 'what to study' or 'syllabus', ";
  ctx += "refer them to this complete syllabus. You can explain topic order, ";
  ctx += "prerequisites, and connections between topics across subjects.\n";
  return ctx;
}

export function getSyllabusSummary(): string {
  let summary = "JUPEB A-level covers 4 subjects:\n";
  for (const [subj, topicList] of Object.entries(SYLLABUSES)) {
    const totalHours = topicList.reduce((sum, t) => sum + t.estimatedHours, 0);
    summary += `- ${subj.charAt(0).toUpperCase() + subj.slice(1)}: ${topicList.length} topics, ~${totalHours}h total\n`;
  }
  return summary;
}

/**
 * System prompt for a Study Chat room opened from a syllabus topic or
 * subtopic: the base tutor personality + a hard scope lock to this one
 * topic (with the student's subtopic prioritised when given) + the full
 * syllabus reference so cross-topic detours can steer back.
 */
export function buildTopicSystemPrompt(
  topic: SyllabusTopic,
  subject: Subject,
  subtopic?: string | null,
): string {
  const scope: string[] = [
    '',
    '=== STUDY ROOM: TOPIC FOCUS ===',
    'You are in a focused study room for ONE topic of the JUPEB syllabus.',
    `Subject: ${SUBJECT_LABELS[subject] ?? subject}`,
    `Topic: ${topic.name} (${topic.difficulty}, ~${topic.estimatedHours}h of syllabus time)`,
    `What it covers: ${topic.description}`,
    `Subtopics in this topic: ${topic.subtopics.join(' · ')}`,
  ];
  if (subtopic) {
    scope.push(`Current focus: ${subtopic} — begin here and give this subtopic the most depth.`);
  }
  scope.push(
    '',
    'Rules for this session:',
    '- Stay inside this topic. Briefly connect to prerequisites when it helps, then return to it.',
    '- Teach in small steps and end each answer with a one-line comprehension check.',
    '- Use worked examples in the JUPEB past-question style (state the question, then solve step by step).',
    '- Put ALL math in LaTeX with $ delimiters exactly as specified above.',
    '- If asked about a different subject, answer briefly, then steer back to this topic.',
    '- Suggest which subtopic to tackle next based on how the conversation is going.',
  );
  return TUTOR_SYSTEM_PROMPT + scope.join('\n') + '\n' + getSyllabusContext();
}

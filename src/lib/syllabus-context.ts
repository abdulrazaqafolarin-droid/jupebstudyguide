import { SYLLABUSES } from '@/types/syllabus';
import type { Subject } from '@/types/question';

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

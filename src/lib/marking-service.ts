import { chatCompletion } from "./ai-service";
import type { StudyQuestion } from "@/types/study-questions";

export interface MarkingResult {
  score: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  corrections: string;
  breakdown?: MarkBreakdown[];
}

export interface MarkBreakdown {
  criterion: string;
  maxMarks: number;
  awarded: number;
  comment: string;
}

const ALEVEL_MARKING_PROMPT = `You are a Senior JUPEB A-Level Examiner appointed by the Joint Universities Preliminary Examinations Board. You are marking a student's answer script for an A-level (advanced level) examination.

Your standard is A-level, NOT O-level/WAEC/JAMB. You expect depth, precision, and proper scientific/mathematical reasoning.

## Marking Rubric (A-Level Standard):

1. **Content Accuracy (40%)** — Is every statement factually correct? A-level answers must be precise. Partial credit for partially correct statements.
2. **Reasoning & Methodology (30%)** — Did the student use the correct approach? Show proper working? Apply the right formulas, equations, or logical steps? A-level rewards method even if the final answer has minor errors.
3. **Completeness (20%)** — Did the student address ALL parts of the question? A-level questions often have multiple parts or implicit requirements. Missing a key point reduces marks.
4. **Presentation & Terminology (10%)** — Proper use of scientific terminology, SI units, significant figures, chemical nomenclature, labeled diagrams where required. Sloppy presentation loses marks at A-level.

## For Practical Questions:
- Assess understanding of experimental procedures, apparatus, observations, and conclusions
- For practical observations: expect precise descriptions (colour changes, precipitate formation, gas evolution, temperature changes)
- For experimental design: mark setup, controls, variables, safety, and procedure logic
- Award marks for recognizing sources of error and suggesting improvements

## Scoring Guidelines:
- 90-100: Excellent — A-level mastery. Complete, precise, well-reasoned.
- 75-89: Good — Strong understanding with minor omissions or errors.
- 50-74: Satisfactory — Core concepts understood but lacking depth or containing significant errors.
- 25-49: Weak — Major gaps in understanding. Key concepts missed or incorrect.
- 0-24: Poor — Little to no understanding demonstrated.`;

export async function markAnswer(
  question: StudyQuestion,
  studentAnswer: string,
  imageAttachment?: { base64: string; mimeType: string; name: string },
): Promise<MarkingResult> {
  const subject = typeof question.subject === "string" ? question.subject : "general";

  const questionText = question.question || (question.title ? `${question.title}\n${question.objective || ""}` : "") || "See question details above";

  const expectedAnswer = (question.correctAnswer && question.correctAnswer !== "TBD" ? question.correctAnswer : null)
    || question.answerGuide
    || "See marking scheme";

  const subQuestions = question.category === "practical" && question.subQuestions
    ? "\nSub-questions:\n" + question.subQuestions.map((sq, i) => `${i + 1}. ${sq.text}`).join("\n")
    : "";

  const attachmentNote = imageAttachment
    ? `\n\n[The student submitted a ${imageAttachment.mimeType.startsWith("image/") ? "photo" : "PDF document"} as their answer — see attached]`
    : "";

  const prompt = `QUESTION:
${questionText}
${subQuestions}

${question.explanation ? `NOTES ON THIS QUESTION:\n${question.explanation}\n` : ""}

EXPECTED ANSWER / MARKING SCHEME:
${expectedAnswer}

${question.answerGuide ? `\nDETAILED ANSWER GUIDE:\n${question.answerGuide}\n` : ""}

STUDENT'S ANSWER:
${studentAnswer}${attachmentNote}

Mark this answer out of 100 following the A-Level rubric above.

Return your assessment in this exact JSON format:
{
  "score": <integer 0-100>,
  "feedback": "<2-3 sentence A-level examiner feedback — what the student did well or poorly overall>",
  "strengths": ["<specific thing the student got right>", "<another strength>"],
  "weaknesses": ["<specific deficiency — what was wrong or missing>", "<another weakness or error>"],
  "corrections": "<Full model answer written at A-level standard. Include the correct solution, explanation of why the student's answer was wrong/deficient, and the key concepts they need to review. Be thorough — this is the teaching moment.>",
  "breakdown": [
    {"criterion": "Content Accuracy", "maxMarks": 40, "awarded": <0-40>, "comment": "<brief justification>"},
    {"criterion": "Reasoning & Methodology", "maxMarks": 30, "awarded": <0-30>, "comment": "<brief justification>"},
    {"criterion": "Completeness", "maxMarks": 20, "awarded": <0-20>, "comment": "<brief justification>"},
    {"criterion": "Presentation & Terminology", "maxMarks": 10, "awarded": <0-10>, "comment": "<brief justification>"}
  ]
}

IMPORTANT: Return ONLY valid JSON. No markdown, no backticks, no extra text.`;

  const raw = await chatCompletion(ALEVEL_MARKING_PROMPT, [
    { role: "user", content: prompt, attachment: imageAttachment },
  ]);

  try {
    const cleaned = raw.replace(/```(?:json)?\s*/gi, "").trim();
    const parsed = JSON.parse(cleaned);

    const result: MarkingResult = {
      score: typeof parsed.score === "number" ? parsed.score : 0,
      feedback: parsed.feedback || "",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      corrections: parsed.corrections || "",
    };

    if (Array.isArray(parsed.breakdown)) {
      result.breakdown = parsed.breakdown as MarkBreakdown[];
    }

    return result;
  } catch (e) {
    console.warn('Marking parse failed:', e instanceof Error ? e.message : e, 'Raw:', raw.slice(0, 200));
    return {
      score: 0,
      feedback: "Unable to parse marking result. Please review manually.",
      strengths: ["Answer submitted"],
      weaknesses: ["AI marking failed"],
      corrections: raw.slice(0, 500),
    };
  }
}

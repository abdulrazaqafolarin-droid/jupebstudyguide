import { chatCompletion } from "./ai-service";
import type { StudyQuestion } from "@/types/study-questions";

export interface MarkingResult {
  score: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  corrections: string;
}

const SUBJECT_MARKING_PROMPTS: Record<string, string> = {
  physics: `You are a JAMB/WAEC Physics examiner. Mark the student's answer against the expected response.
Be fair but thorough. Award partial credit for correct reasoning even if final answer is wrong.
Focus on: formula usage, unit handling, conceptual understanding, and numerical accuracy.
Provide constructive feedback as if you were a tutor.`,

  chemistry: `You are a JAMB/WAEC Chemistry examiner. Mark the student's answer against the expected response.
Award partial credit for correct method even if final answer differs.
Focus on: chemical equations, reaction mechanisms, mole calculations, IUPAC naming, and practical observations.
Provide constructive feedback as if you were a tutor.`,

  biology: `You are a JAMB/WAEC Biology examiner. Mark the student's answer against the expected response.
Award partial credit for partially correct explanations.
Focus on: accuracy of biological terminology, logical flow of explanation, completeness of points.
Provide constructive feedback as if you were a tutor.`,

  math: `You are a JAMB/WAEC Mathematics examiner. Mark the student's answer against the expected response.
Award partial credit for correct method steps even if final answer is wrong.
Focus on: formula application, step-by-step logic, algebraic manipulation, and final accuracy.
Provide constructive feedback as if you were a tutor.`,
};

export async function markAnswer(
  question: StudyQuestion,
  studentAnswer: string,
  imageAttachment?: { base64: string; mimeType: string; name: string },
): Promise<MarkingResult> {
  const subject = typeof question.subject === "string" ? question.subject : "general";
  const systemPrompt = SUBJECT_MARKING_PROMPTS[subject] ?? "You are a JAMB/WAEC examiner. Mark fairly and constructively.";

  const questionText = question.question || (question.title ? `${question.title}\n${question.objective || ""}` : "") || "See question details above";

  const expectedAnswer = (question.correctAnswer && question.correctAnswer !== "TBD" ? question.correctAnswer : null)
    || question.answerGuide
    || "See marking scheme";

  const attachmentNote = imageAttachment
    ? `\n\n[The student submitted a ${imageAttachment.mimeType.startsWith("image/") ? "photo" : "PDF document"} as their answer — see attached]`
    : "";

  const prompt = `QUESTION:
${questionText}
${question.category === "practical" && question.subQuestions ? "\nSub-questions:\n" + question.subQuestions.map((sq, i) => `${i + 1}. ${sq.text}`).join("\n") : ""}

EXPECTED ANSWER / MARKING SCHEME:
${expectedAnswer}

STUDENT'S ANSWER:
${studentAnswer}${attachmentNote}

Mark this answer out of 100. Return your assessment in this exact JSON format:
{
  "score": <integer 0-100>,
  "feedback": "<2-3 sentence summary of the marking>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "corrections": "<correct answer or detailed correction if the student was wrong, or 'Correct!' if fully right>"
}

IMPORTANT: Return ONLY valid JSON. No markdown, no backticks, no extra text.`;

  const raw = await chatCompletion(systemPrompt, [
    { role: "user", content: prompt, attachment: imageAttachment },
  ]);

  try {
    const cleaned = raw.replace(/```(?:json)?\s*/gi, "").trim();
    return JSON.parse(cleaned) as MarkingResult;
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

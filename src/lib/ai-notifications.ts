import { chatCompletion } from "./ai-service";
import type { AppNotification, NotificationKind } from "@/hooks/useNotifications";

interface AIEventContext {
  action: "quiz_completed" | "streak_milestone" | "weak_area" | "study_session" | "rank_change" | "inactivity";
  subject?: string;
  score?: number;
  streak?: number;
  rank?: number;
  weakTopics?: string[];
  studyMinutes?: number;
}

const DAILY_LIMIT = 3;
const STORAGE_KEY = "ai-notification-daily";

function getDailyCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const { date, count } = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    return date === today ? count : 0;
  } catch {
    return 0;
  }
}

function incrementDailyCount() {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: getDailyCount() + 1 }));
}

export function canSendAINotification(): boolean {
  return getDailyCount() < DAILY_LIMIT;
}

const EVENT_PROMPTS: Record<AIEventContext["action"], string> = {
  quiz_completed: "The user just finished a quiz. Congratulate them and give a tip to improve further.",
  streak_milestone: "The user hit a study streak milestone. Encourage them to keep going.",
  weak_area: "The user has a weak topic area. Suggest a focused study approach.",
  study_session: "The user completed a study session. Give a brief, motivating message.",
  rank_change: "The user's rank changed. Acknowledge it warmly.",
  inactivity: "The user hasn't studied today. Give a gentle, encouraging nudge.",
};

export async function generateAINotification(
  context: AIEventContext,
): Promise<Omit<AppNotification, "id" | "createdAt" | "read"> | null> {
  if (!canSendAINotification()) return null;

  const promptBase = EVENT_PROMPTS[context.action] ?? "Generate a short, friendly study notification.";

  const details = [
    context.subject && `Subject: ${context.subject}`,
    context.score !== undefined && `Score: ${context.score}%`,
    context.streak && `Streak: ${context.streak} days`,
    context.rank !== undefined && `Rank: #${context.rank}`,
    context.weakTopics?.length && `Weak topics: ${context.weakTopics.join(", ")}`,
    context.studyMinutes && `Study time: ${context.studyMinutes} min`,
  ].filter(Boolean).join(" | ");

  const prompt = `You are a friendly, encouraging study assistant for a JUPEB exam prep app. 
Generate a personalized notification for the user.

CONTEXT:
${promptBase}
${details ? `\nAdditional context:\n${details}` : ""}

Return ONLY valid JSON with these fields:
{
  "kind": "info" | "achievement" | "streak" | "reminder",
  "title": "<short, punchy title, max 60 chars>",
  "body": "<encouraging body text, max 120 chars>"
}

IMPORTANT: 
- Be specific, not generic. Mention the subject or achievement if available.
- Keep the tone warm and motivating.
- Never use markdown in the response.
- Return ONLY the JSON object, no other text.`;

  try {
    const raw = await chatCompletion(
      "You generate personalized study notifications. Be concise and encouraging.",
      [{ role: "user", content: prompt }],
    );

    const cleaned = raw.replace(/```(?:json)?\s*/gi, "").trim();
    const parsed = JSON.parse(cleaned);

    const kind: NotificationKind = ["achievement", "streak", "reminder", "info"].includes(parsed.kind)
      ? parsed.kind
      : "info";

    incrementDailyCount();

    return {
      kind,
      title: parsed.title ?? "Study Tip",
      body: parsed.body ?? "Keep up the great work!",
      dedupe: `ai:${context.action}:${new Date().toISOString().slice(0, 10)}:${context.subject ?? "general"}`,
    };
  } catch {
    return null;
  }
}

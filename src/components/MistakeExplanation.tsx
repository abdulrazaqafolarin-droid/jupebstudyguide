import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import MathRenderer from "@/components/MathRenderer";
import { useUserStorage } from "@/hooks/useUserStorage";
import { streamChat } from "@/lib/ai-service";
import type { Question } from "@/types/question";

const CACHE_KEY = "mistake-explanations";
const MAX_CACHE_ENTRIES = 120;

const SYSTEM_PROMPT = [
  "You are a JUPEB tutor explaining one multiple-choice mistake.",
  "The student already submitted this attempt and has seen the correct answer,",
  "so focus on understanding, not on testing.",
  "In under 180 words: (1) why their chosen option looks tempting but is wrong,",
  "(2) the single key idea that makes the correct option right.",
  "Use LaTeX $...$ for ALL mathematical expressions.",
  "Plain, encouraging tone. Never discuss anything beyond this question.",
].join(" ");

function friendlyError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("401") || lower.includes("session")) {
    return "Your session expired. Sign in again, then retry.";
  }
  if (
    lower.includes("429") || lower.includes("quota") || lower.includes("rate") ||
    lower.includes("503") || lower.includes("overload") || lower.includes("high demand") ||
    lower.includes("unavailable") || lower.includes("exhausted") || lower.includes("cooling down")
  ) {
    return "The AI tutor is busy right now (all providers are at capacity). Try again in a bit — your answer is saved.";
  }
  return "Couldn't fetch the explanation. Check your connection and retry.";
}

interface MistakeExplanationProps {
  subject: string;
  topicName: string;
  question: Question;
  selectedAnswer: string;
}

/**
 * On-demand AI autopsy of one wrong answer, mounted in the mission
 * recovery review. Streams via the shared chat-proxy (key-vault failover),
 * renders markdown + LaTeX, and caches per question+choice so repeat views
 * and re-taps cost nothing.
 */
export function MistakeExplanation({ subject, topicName, question, selectedAnswer }: MistakeExplanationProps) {
  const cacheKey = `${question.id}::${selectedAnswer.toUpperCase()}`;
  const [cache, setCache] = useUserStorage<Record<string, string>>(CACHE_KEY, {});
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pick up a cached explanation once storage hydrates.
  useEffect(() => {
    if (!text && !loading && cache[cacheKey]) setText(cache[cacheKey]);
  }, [cache, cacheKey, text, loading]);

  const start = () => {
    setOpen(true);
    setError(null);
    if (cache[cacheKey]) {
      setText(cache[cacheKey]);
      return;
    }
    if (loading) return;
    setLoading(true);
    const options = (question.options ?? [])
      .map((o) => `${o.label}. ${o.text}`)
      .join("\n");
    const userMessage = [
      `Subject: ${subject}`,
      `Topic: ${topicName}`,
      `Question: ${question.question}`,
      `Options:\n${options}`,
      `Correct answer: ${question.correctAnswer}`,
      `The student chose: ${selectedAnswer}`,
      question.explanation ? `Bank explanation: ${question.explanation}` : "",
    ].filter(Boolean).join("\n\n");
    let full = "";
    void streamChat(
      SYSTEM_PROMPT,
      [{ role: "user", content: userMessage }],
      {
        onDelta: (delta) => {
          full += delta;
          setText(full);
        },
        onDone: () => {
          setLoading(false);
          const finalText = full;
          setCache((prev) => {
            const next = { ...prev, [cacheKey]: finalText };
            const keys = Object.keys(next);
            if (keys.length > MAX_CACHE_ENTRIES) {
              for (const old of keys.slice(0, keys.length - MAX_CACHE_ENTRIES)) delete next[old];
            }
            return next;
          });
        },
        onError: (err) => {
          setLoading(false);
          setError(friendlyError(err));
        },
      },
    );
  };

  return (
    <div className="pt-1">
      {!open ? (
        <Button
          variant="outline"
          size="sm"
          onClick={start}
          className="gap-1.5 text-xs"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Explain my mistake
        </Button>
      ) : (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Why this tripped you up
          </p>
          {loading && !text && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Asking the AI tutor…
            </p>
          )}
          {text && <MathRenderer content={text} className="text-sm leading-6" />}
          {loading && text && (
            <span className="mt-1 inline-block h-3.5 w-1.5 animate-pulse rounded bg-primary/60" aria-hidden />
          )}
          {error && (
            <div className="space-y-2">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={start} disabled={loading} className="text-xs">
                Retry
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MistakeExplanation;

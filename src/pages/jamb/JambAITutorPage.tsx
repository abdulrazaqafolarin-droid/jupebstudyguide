import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bot } from "lucide-react";
import { ThreadView } from "@/components/study-chat/ThreadView";
import { Composer } from "@/components/study-chat/Composer";
import { useIsMobile } from "@/hooks/use-mobile";
import type { AIMessage } from "@/hooks/useAITutorChats";
import { streamChat, type AIChatMessage } from "@/lib/ai-service";
import { JAMB_TUTOR_PROMPT, JAMB_TUTOR_STARTERS } from "@/lib/jamb-prompts";
import { getJambPublishedQuestionById } from "@/lib/jamb-question-service";
import { JAMB_SUBJECTS } from "@/lib/jamb-config";
import { toast } from "sonner";

const JAMB_EMPTY_DESCRIPTION =
  "Ask about Physics, Chemistry or Biology. Your tutor uses the JAMB question context and keeps JAMB references separate from JUPEB.";

export default function JambAITutorPage() {
  const [params] = useSearchParams();
  const isMobile = useIsMobile();
  const requestedSubject = params.get("subject")?.toLowerCase();
  const subject = JAMB_SUBJECTS.includes(requestedSubject as (typeof JAMB_SUBJECTS)[number])
    ? requestedSubject
    : undefined;
  const questionId = params.get("questionId");

  const [questionContext, setQuestionContext] = useState("");
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    if (!questionId) {
      setQuestionContext("");
      return;
    }
    getJambPublishedQuestionById(questionId)
      .then((question) => {
        if (!active || !question) return;
        setQuestionContext([
          `Subject: ${question.subject}`,
          `Year: ${question.year}`,
          `Question: ${question.question}`,
          `Options: ${question.options.map((option) => `${option.label}. ${option.text}`).join("\n")}`,
        ].join("\n"));
      })
      .catch((reason) => {
        if (active) toast.error(reason instanceof Error ? reason.message : "Could not load the question context.");
      });
    return () => { active = false; };
  }, [questionId]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  useEffect(() => () => {
    abortRef.current?.abort();
  }, []);

  const send = useCallback(async (
    value: string,
    attachment: { base64: string; mimeType: string; name: string } | null = null,
    rewindIndex?: number,
  ) => {
    const trimmed = value.trim();
    if ((!trimmed && !attachment) || loading) return;

    const base = rewindIndex !== undefined
      ? messages.slice(0, rewindIndex)
      : editingIndex !== null
        ? messages.slice(0, editingIndex)
        : messages;
    const userMessage: AIMessage = {
      role: "user",
      content: trimmed || `[Attached: ${attachment?.name ?? "file"}]`,
      attachment,
    };
    const next = [...base, userMessage];
    setMessages(next);
    setInput("");
    setEditingIndex(null);
    setLoading(true);
    setStreamError(null);

    const ac = new AbortController();
    abortRef.current = ac;
    const history: AIChatMessage[] = next.map((message) => ({
      role: message.role,
      content: message.content,
      attachment: message.attachment?.base64
        ? {
            base64: message.attachment.base64,
            mimeType: message.attachment.mimeType,
            name: message.attachment.name,
          }
        : undefined,
    }));
    const context = questionContext
      ? `\n\nCurrent JAMB question (ungraded source projection):\n${questionContext}`
      : "";
    const retrievalQuery = [subject, questionContext, trimmed].filter(Boolean).join("\n");

    const updateAssistant = (patch: Partial<AIMessage>) => {
      setMessages((previous) => {
        const copy = [...previous];
        const lastIndex = copy.length - 1;
        if (copy[lastIndex]?.role === "assistant") {
          copy[lastIndex] = { ...copy[lastIndex], ...patch };
        } else {
          copy.push({ role: "assistant", content: "", ...patch });
        }
        return copy;
      });
    };

    await streamChat(
      JAMB_TUTOR_PROMPT + context,
      history,
      {
        onDelta: (delta) => {
          setMessages((previous) => {
            const copy = [...previous];
            const lastIndex = copy.length - 1;
            if (copy[lastIndex]?.role === "assistant") {
              copy[lastIndex] = { ...copy[lastIndex], content: copy[lastIndex].content + delta };
            } else {
              copy.push({ role: "assistant", content: delta });
            }
            return copy;
          });
        },
        onQuestionReferences: (refs) => updateAssistant({ questionRefs: refs }),
        onDone: () => {
          if (abortRef.current === ac) abortRef.current = null;
          setLoading(false);
        },
        onError: (message) => {
          if (abortRef.current === ac) abortRef.current = null;
          setStreamError(message);
          setLoading(false);
        },
      },
      undefined,
      subject,
      ac.signal,
      retrievalQuery,
      "jamb",
    );
  }, [editingIndex, loading, messages, questionContext, subject]);

  const handleEdit = useCallback((index: number, text: string) => {
    setEditingIndex(index);
    setInput(text);
  }, []);

  const handleRetry = useCallback(() => {
    const lastUserIndex = messages.map((message) => message.role).lastIndexOf("user");
    if (lastUserIndex < 0) return;
    const message = messages[lastUserIndex];
    void send(
      message.content,
      message.attachment?.base64
        ? {
            base64: message.attachment.base64,
            mimeType: message.attachment.mimeType,
            name: message.attachment.name,
          }
        : null,
      lastUserIndex,
    );
  }, [messages, send]);

  const handleSend = useCallback((attachment: { base64: string; mimeType: string; name: string } | null) => {
    void send(input, attachment);
  }, [input, send]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {!isMobile && (
          <aside className="hidden w-[280px] shrink-0 border-r border-border/60 bg-card/30 md:flex md:flex-col">
            <div className="border-b border-border/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold">JAMB Study Room</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                A separate study space for UTME preparation.
              </p>
            </div>
            <div className="flex-1 space-y-1 p-3">
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Study spaces</p>
              <Link to="/jamb/past-questions" className="block rounded-lg px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground">Past questions</Link>
              <Link to="/jamb/cbt/setup" className="block rounded-lg px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground">Timed CBT practice</Link>
              <Link to="/jamb/syllabus" className="block rounded-lg px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground">Syllabus status</Link>
              <Link to="/jamb" className="block rounded-lg px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground">JAMB dashboard</Link>
            </div>
            <div className="border-t border-border/60 p-3">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs font-semibold text-primary">JAMB-aware tutor</p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Question references and study prompts stay within the JAMB workspace.</p>
              </div>
            </div>
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-3 py-2.5 backdrop-blur-sm">
            <Link
              to="/jamb"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              aria-label="Back to JAMB workspace"
              title="Back to JAMB workspace"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold">AI Study Tutor</h1>
              <p className="truncate text-[10px] text-muted-foreground">
                {subject ? `${subject.charAt(0).toUpperCase() + subject.slice(1)} · JAMB study room` : "JAMB study room"}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
              <Bot className="h-3 w-3" /> JAMB-aware
            </span>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto">
            <ThreadView
              messages={messages}
              isStreaming={loading}
              streamError={streamError}
              editingIndex={editingIndex}
              activeTopic={null}
              onEdit={handleEdit}
              onRetry={handleRetry}
              onStarter={(prompt) => void send(prompt)}
              starterPrompts={JAMB_TUTOR_STARTERS}
              emptyTitle="JAMB AI Study Tutor"
              emptyDescription={JAMB_EMPTY_DESCRIPTION}
            />
          </main>

          <Composer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onStop={stop}
            isStreaming={loading}
            placeholder={
              editingIndex !== null
                ? "Edit your message…"
                : subject
                  ? `Ask about ${subject}…`
                  : "Ask your JAMB tutor…"
            }
            editing={editingIndex !== null}
            onCancelEdit={() => { setEditingIndex(null); setInput(""); }}
          />
        </div>
      </div>
    </div>
  );
}

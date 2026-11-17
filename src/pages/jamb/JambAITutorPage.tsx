import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bot, Send, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";
import { streamChat, type AIChatMessage, type QuestionRef } from "@/lib/ai-service";
import { JAMB_TUTOR_PROMPT, JAMB_TUTOR_STARTERS } from "@/lib/jamb-prompts";
import { getJambPublishedQuestionById } from "@/lib/jamb-question-service";
import { QuestionMath } from "@/components/QuestionMath";
import QuestionRefChips from "@/components/QuestionRefChips";

interface TutorMessage { role: "user" | "assistant"; content: string; refs?: QuestionRef[] }

export default function JambAITutorPage() {
  const [params] = useSearchParams();
  const subject = params.get("subject") || undefined;
  const questionId = params.get("questionId");
  const [questionContext, setQuestionContext] = useState<string>("");
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    if (!questionId) return;
    getJambPublishedQuestionById(questionId).then((question) => {
      if (!active || !question) return;
      setQuestionContext([
        `Subject: ${question.subject}`,
        `Year: ${question.year}`,
        `Question: ${question.question}`,
        `Options: ${question.options.map((option) => `${option.label}. ${option.text}`).join("\n")}`,
      ].join("\n"));
    }).catch((reason) => { if (active) toast.error(reason instanceof Error ? reason.message : "Could not load the question context."); });
    return () => { active = false; };
  }, [questionId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, loading]);

  const stop = () => { abortRef.current?.abort(); abortRef.current = null; setLoading(false); };

  const send = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    const next: TutorMessage[] = [...messages, { role: "user", content: trimmed }, { role: "assistant", content: "" }];
    setMessages(next);
    setInput("");
    setLoading(true);
    const ac = new AbortController();
    abortRef.current = ac;
    let output = "";
    const history: AIChatMessage[] = next.slice(0, -1).map((message) => ({ role: message.role, content: message.content }));
    const context = questionContext ? `\n\nCurrent JAMB question (ungraded source projection):\n${questionContext}` : "";
    await streamChat(JAMB_TUTOR_PROMPT + context, history, {
      onDelta: (delta) => {
        output += delta;
        setMessages((previous) => {
          const copy = [...previous];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: output };
          return copy;
        });
      },
      onQuestionReferences: (refs) => {
        setMessages((previous) => {
          const copy = [...previous];
          copy[copy.length - 1] = { ...copy[copy.length - 1], refs };
          return copy;
        });
      },
      onDone: () => { abortRef.current = null; setLoading(false); },
      onError: (message) => { abortRef.current = null; setLoading(false); toast.error(message); },
    }, undefined, subject, ac.signal, [subject, questionContext, trimmed].filter(Boolean).join("\n"), "jamb");
  };

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col bg-background px-3 pb-24 pt-4">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        <header className="mb-4 flex items-center gap-3">
          <Link to="/jamb" aria-label="Back to JAMB home" className="rounded-lg border border-border p-2 hover:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
          <div><p className="text-xs text-muted-foreground">JAMB workspace</p><h1 className="text-xl font-bold">AI Study Tutor</h1></div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary"><Bot className="h-3 w-3" /> JAMB-aware</span>
        </header>

        <div className="flex-1 space-y-4">
          {messages.length === 0 && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-2 flex items-center gap-2 text-primary"><Sparkles className="h-5 w-5" /><p className="font-semibold">Learn it. Understand it. Remember it.</p></div>
              <p className="mb-4 text-sm text-muted-foreground">Ask about Physics, Chemistry or Biology. The tutor keeps JAMB references separate from JUPEB and will tell you when no verified syllabus or answer key is available.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {JAMB_TUTOR_STARTERS.map((starter) => <button key={starter} onClick={() => void send(starter)} className="rounded-xl border border-border p-3 text-left text-xs hover:bg-accent">{starter}</button>)}
              </div>
            </section>
          )}
          {messages.map((message, index) => (
            <article key={index} className={`max-w-[92%] rounded-2xl p-4 text-sm leading-relaxed ${message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "mr-auto border border-border bg-card"}`}>
              {message.role === "assistant" ? <QuestionMath content={message.content || (loading && index === messages.length - 1 ? "Thinking…" : "")} /> : <p className="whitespace-pre-wrap">{message.content}</p>}
              {message.refs?.length ? <QuestionRefChips refs={message.refs} /> : null}
            </article>
          ))}
          <div ref={endRef} />
        </div>

        <form onSubmit={(event) => { event.preventDefault(); void send(input); }} className="mt-4 flex items-end gap-2 rounded-2xl border border-border bg-card p-2">
          <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={1} placeholder="Ask your JAMB tutor…" className="max-h-36 min-h-11 flex-1 resize-y bg-transparent px-2 py-3 text-sm outline-none" />
          {loading ? <button type="button" onClick={stop} aria-label="Stop response" className="rounded-xl bg-destructive p-3 text-destructive-foreground"><Square className="h-4 w-4" /></button> : <button type="submit" disabled={!input.trim()} aria-label="Send message" className="rounded-xl bg-primary p-3 text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button>}
        </form>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">AI explanations can be imperfect. Verify answer keys and official syllabus details from approved sources.</p>
      </div>
    </main>
  );
}

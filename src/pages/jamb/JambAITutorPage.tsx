import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bot, Menu, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStudyChat } from "@/hooks/useStudyChat";
import { HistorySidebar } from "@/components/study-chat/HistorySidebar";
import { ThreadView } from "@/components/study-chat/ThreadView";
import { Composer } from "@/components/study-chat/Composer";
import { getJambPublishedQuestionById } from "@/lib/jamb-question-service";
import { JAMB_SUBJECTS, JAMB_SUBJECT_INFO } from "@/lib/jamb-config";
import { JAMB_TUTOR_PROMPT, JAMB_TUTOR_STARTERS } from "@/lib/jamb-prompts";
import type { AIMessage } from "@/hooks/useAITutorChats";
import { toast } from "sonner";

function isJambSubject(value: string | null): value is (typeof JAMB_SUBJECTS)[number] {
  return Boolean(value && JAMB_SUBJECTS.includes(value as (typeof JAMB_SUBJECTS)[number]));
}

export default function JambAITutorPage() {
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const requestedSubject = searchParams.get("subject")?.toLowerCase() ?? null;
  const subject = isJambSubject(requestedSubject) ? requestedSubject : undefined;
  const questionId = searchParams.get("questionId");

  const [questionContext, setQuestionContext] = useState("");
  const [questionContextTitle, setQuestionContextTitle] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [input, setInput] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const openedInitialChatRef = useRef(false);

  const extraSystemContext = useMemo(
    () => questionContext
      ? `\n\nThe student opened this JAMB tutor from a published question. Use it as the current context only when relevant. Do not infer an official answer key from it.\n${questionContext}`
      : "",
    [questionContext],
  );

  const {
    chats,
    activeChatId,
    messages,
    isStreaming,
    listLoading,
    streamError,
    activeTopic,
    switchChat,
    newChat,
    deleteChat,
    renameChat,
    sendMessage,
    sendEdited,
    retry,
    stop,
  } = useStudyChat("jamb", JAMB_TUTOR_PROMPT, extraSystemContext);

  useEffect(() => {
    let active = true;
    if (!questionId) {
      setQuestionContext("");
      setQuestionContextTitle("");
      return;
    }
    getJambPublishedQuestionById(questionId)
      .then((question) => {
        if (!active || !question) return;
        setQuestionContext([
          `Subject: ${JAMB_SUBJECT_INFO[question.subject].label}`,
          `Year: ${question.year}`,
          `Question: ${question.question}`,
          `Options: ${question.options.map((option) => `${option.label}. ${option.text}`).join("\n")}`,
        ].join("\n"));
        setQuestionContextTitle(`${JAMB_SUBJECT_INFO[question.subject].label} · ${question.year}`);
      })
      .catch((reason: unknown) => {
        if (active) toast.error(reason instanceof Error ? reason.message : "Could not load the question context.");
      });
    return () => { active = false; };
  }, [questionId]);

  // Resume the newest JAMB-only thread when entering the tutor without a
  // selected conversation. JUPEB rows are filtered in the shared hook.
  useEffect(() => {
    if (openedInitialChatRef.current || listLoading || activeChatId || chats.length === 0) return;
    openedInitialChatRef.current = true;
    void switchChat(chats[0].id);
  }, [listLoading, activeChatId, chats, switchChat]);

  useEffect(() => () => {
    // The shared hook also aborts on unmount. This local cleanup only resets
    // the staged editor so no pending text leaks across route remounts.
    setEditingIndex(null);
  }, []);

  const createChat = useCallback(async () => {
    const id = await newChat(subject);
    if (id) {
      setInput("");
      setEditingIndex(null);
      setDrawerOpen(false);
    }
    return id;
  }, [newChat, subject]);

  const handleSend = useCallback(async (
    attachment: { base64: string; mimeType: string; name: string } | null,
  ) => {
    const text = input.trim();
    if ((!text && !attachment) || isStreaming) return;

    // First message creates a dedicated JAMB chat row; newChat updates the
    // hook's active-chat ref before resolving, so the message is persisted
    // against the correct programme-scoped conversation.
    if (!activeChatId) {
      const id = await createChat();
      if (!id) return;
    }

    setInput("");
    if (editingIndex !== null) {
      const index = editingIndex;
      setEditingIndex(null);
      void sendEdited(text, index);
    } else {
      void sendMessage(text, attachment);
    }
  }, [input, isStreaming, activeChatId, createChat, editingIndex, sendEdited, sendMessage]);

  const handleStarter = useCallback(async (text: string) => {
    if (isStreaming) return;
    if (!activeChatId) {
      const id = await createChat();
      if (!id) return;
    }
    void sendMessage(text);
  }, [isStreaming, activeChatId, createChat, sendMessage]);

  const handleEdit = useCallback((index: number, text: string) => {
    setEditingIndex(index);
    setInput(text);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null);
    setInput("");
  }, []);

  const handleSelectChat = useCallback((id: string) => {
    void switchChat(id);
    setDrawerOpen(false);
    setEditingIndex(null);
    setInput("");
  }, [switchChat]);

  const sidebar = (
    <HistorySidebar
      heading="JAMB Tutor History"
      chats={chats}
      activeChatId={activeChatId}
      loading={listLoading}
      onSelect={handleSelectChat}
      onNewChat={() => { void createChat(); }}
      onRename={(id, next) => void renameChat(id, next)}
      onDelete={(id) => void deleteChat(id)}
      onClose={isMobile ? () => setDrawerOpen(false) : undefined}
    />
  );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-[280px] shrink-0 border-r border-border/60 bg-card/30 md:block">
          {sidebar}
        </aside>

        {isMobile && drawerOpen && (
          <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="JAMB tutor history">
            <div className="flex h-full w-[85%] max-w-[320px] flex-col border-r border-border/60 bg-background shadow-2xl">
              {sidebar}
            </div>
            <button
              type="button"
              className="flex-1 bg-black/50"
              aria-label="Close history"
              onClick={() => setDrawerOpen(false)}
            />
          </div>
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
            {isMobile && (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                aria-label="Open JAMB tutor history"
                title="Conversation history"
              >
                <Menu className="h-4 w-4" />
              </button>
            )}
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold">
                {subject ? `${JAMB_SUBJECT_INFO[subject].label} Tutor` : "JAMB AI Study Tutor"}
              </h1>
              <p className="truncate text-[10px] text-muted-foreground">JAMB · UTME study room · Saved conversation</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 shrink-0 gap-1 px-2 text-xs"
              onClick={() => { void createChat(); }}
              title="New JAMB chat"
            >
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">New chat</span>
            </Button>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto">
            {questionContext && (
              <div className="mx-auto w-full max-w-3xl px-4 pt-4">
                <section className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                    <p className="min-w-0 flex-1 truncate text-xs font-semibold text-primary">
                      Opened from a JAMB question{questionContextTitle ? ` · ${questionContextTitle}` : ""}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setQuestionContext(""); setQuestionContextTitle(""); }}
                      aria-label="Remove question context"
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{questionContext}</p>
                </section>
              </div>
            )}

            <ThreadView
              messages={messages as AIMessage[]}
              isStreaming={isStreaming}
              streamError={streamError}
              editingIndex={editingIndex}
              activeTopic={activeTopic}
              onEdit={handleEdit}
              onRetry={() => void retry()}
              onStarter={(prompt) => void handleStarter(prompt)}
              starterPrompts={JAMB_TUTOR_STARTERS}
              emptyTitle="JAMB AI Study Tutor"
              emptyDescription="Ask about Physics, Chemistry or Biology. Your conversations are saved in a separate JAMB history, so your JUPEB tutor threads stay untouched."
            />

            {!listLoading && chats.length === 0 && !activeChatId && (
              <div className="mx-auto -mt-2 max-w-xl px-4 pb-8 text-center">
                <Button onClick={() => { void createChat(); }} className="gap-2">
                  <Plus className="h-4 w-4" /> Start your first JAMB chat
                </Button>
              </div>
            )}
          </main>

          <Composer
            value={input}
            onChange={setInput}
            onSend={(attachment) => { void handleSend(attachment); }}
            onStop={stop}
            isStreaming={isStreaming}
            placeholder={
              editingIndex !== null
                ? "Edit your message…"
                : subject
                  ? `Ask about ${JAMB_SUBJECT_INFO[subject].label}…`
                  : "Ask your JAMB tutor…"
            }
            editing={editingIndex !== null}
            onCancelEdit={handleCancelEdit}
          />
        </div>
      </div>
    </div>
  );
}

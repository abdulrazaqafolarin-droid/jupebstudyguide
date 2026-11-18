import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Bot, Menu, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TextbookUploader } from "@/components/TextbookUploader";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStudyChat } from "@/hooks/useStudyChat";
import { HistorySidebar } from "@/components/study-chat/HistorySidebar";
import { ThreadView } from "@/components/study-chat/ThreadView";
import { Composer } from "@/components/study-chat/Composer";
import { getJambPublishedQuestionById } from "@/lib/jamb-question-service";
import { JAMB_SUBJECTS, JAMB_SUBJECT_INFO } from "@/lib/jamb-config";
import { getJambSyllabusSubject, getJambSyllabusTopic, JAMB_SYLLABUS_REVIEW_NOTICE } from "@/lib/jamb-syllabus";
import type { StudyChatMeta } from "@/lib/study-chat";
import { JAMB_TUTOR_PROMPT, JAMB_TUTOR_STARTERS } from "@/lib/jamb-prompts";
import { toast } from "sonner";

function isJambSubject(value: string | null): value is (typeof JAMB_SUBJECTS)[number] {
  return Boolean(value && JAMB_SUBJECTS.includes(value as (typeof JAMB_SUBJECTS)[number]));
}

export default function JambAITutorPage() {
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const requestedSubject = searchParams.get("subject")?.toLowerCase() ?? null;
  const subject = isJambSubject(requestedSubject) ? requestedSubject : undefined;
  const syllabusSubject = requestedSubject ? getJambSyllabusSubject(requestedSubject) : undefined;
  const requestedTopicId = searchParams.get("topic");
  const syllabusTopic = requestedSubject && requestedTopicId
    ? getJambSyllabusTopic(requestedSubject, requestedTopicId)
    : undefined;
  const questionId = searchParams.get("questionId");
  const tutorSubjectLabel = syllabusSubject?.label ?? (subject ? JAMB_SUBJECT_INFO[subject].label : undefined);
  const tutorSubjectValue = subject ?? (syllabusSubject ? syllabusSubject.id : undefined);

  const [questionContext, setQuestionContext] = useState("");
  const [questionContextTitle, setQuestionContextTitle] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [input, setInput] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showTextbooks, setShowTextbooks] = useState(false);
  const openedInitialChatRef = useRef(false);

  const extraSystemContext = useCallback((chat: StudyChatMeta | null) => {
    const parts: string[] = [];
    if (questionContext) {
      parts.push(`The student opened this JAMB tutor from a published question. Use it as current context only when relevant. Do not infer an official answer key from it.\n${questionContext}`);
    }
    const contextSubject = chat?.subject ? getJambSyllabusSubject(chat.subject) : null;
    const contextTopic = chat?.topic_id && contextSubject
      ? getJambSyllabusTopic(contextSubject.id, chat.topic_id)
      : undefined;
    if (contextTopic && contextSubject) {
      parts.push(`The student selected the syllabus topic "${contextTopic.title}" in ${contextSubject.label}. Use these uploaded-source outline points as a study scope: ${contextTopic.outline.join("; ")}. Source pages: ${contextTopic.sourcePages.join(", ")}. IMPORTANT: ${JAMB_SYLLABUS_REVIEW_NOTICE} Explain the material helpfully, but do not claim this source copy is the verified current official syllabus.`);
    }
    return parts.length ? "\n\n" + parts.join("\n\n") : "";
  }, [questionContext]);

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

  const createChat = useCallback(async () => {
    const id = await newChat(tutorSubjectValue, syllabusTopic?.id);
    if (id) {
      setInput("");
      setEditingIndex(null);
      setDrawerOpen(false);
    }
    return id;
  }, [newChat, tutorSubjectValue, syllabusTopic?.id]);

  const handleSend = useCallback(async (
    attachment: { base64: string; mimeType: string; name: string } | null,
  ) => {
    const text = input.trim();
    if ((!text && !attachment) || isStreaming) return;

    if (!activeChatId) return;
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
    if (isStreaming || !activeChatId) return;
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

  const activeChatMeta = chats.find((chat) => chat.id === activeChatId) ?? null;
  const activeChatSubject = activeChatMeta?.subject
    ? getJambSyllabusSubject(activeChatMeta.subject)
    : undefined;
  const activeChatTopic = activeChatMeta?.topic_id && activeChatSubject
    ? getJambSyllabusTopic(activeChatSubject.id, activeChatMeta.topic_id)
    : undefined;
  const visibleTutorSubject = activeChatSubject ?? syllabusSubject;
  const visibleTutorTopic = activeChatTopic ?? (activeChatMeta ? undefined : syllabusTopic);

  const sidebar = (
    <HistorySidebar
      heading="JAMB Tutor History"
      emptyMessage="Start a new chat to save your JAMB study conversations."
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
                {visibleTutorSubject?.label ? `${visibleTutorSubject.label} Tutor` : tutorSubjectLabel ? `${tutorSubjectLabel} Tutor` : "JAMB AI Study Tutor"}
              </h1>
              <p className="truncate text-[10px] text-muted-foreground">{syllabusTopic ? syllabusTopic.title + " · " : ""}JAMB · Saved conversation</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 shrink-0 gap-1 px-2 text-xs"
              onClick={() => setShowTextbooks(true)}
              title="Open your JAMB textbook library"
              aria-label="Open JAMB textbook library"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Textbooks</span>
            </Button>
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

            {listLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-xs text-muted-foreground">Loading your JAMB tutor history…</p>
              </div>
            ) : activeChatId ? (
              <ThreadView
                messages={messages}
                isStreaming={isStreaming}
                streamError={streamError}
                editingIndex={editingIndex}
                activeTopic={activeTopic}
                onEdit={handleEdit}
                onRetry={() => void retry()}
                onStarter={(prompt) => void handleStarter(prompt)}
                starterPrompts={JAMB_TUTOR_STARTERS}
                emptyTitle="JAMB AI Study Tutor"
                emptyDescription={visibleTutorTopic ? `Study ${visibleTutorTopic.title} with the JAMB tutor. This outline comes from an uploaded source copy pending current IBASS verification.` : "Ask about Physics, Chemistry, Biology, Mathematics or Use of English. Your conversations are saved in a separate JAMB history, so your JUPEB tutor threads stay untouched."}
              />
            ) : chats.length > 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-xs text-muted-foreground">Opening your latest JAMB chat…</p>
              </div>
            ) : (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Start a JAMB study room</h2>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Your JAMB tutor conversations are saved separately from JUPEB. Start a chat to get explanations, practice questions and feedback.
                </p>
                <Button onClick={() => { void createChat(); }} className="gap-2">
                  <Plus className="h-4 w-4" /> Start your first JAMB chat
                </Button>
              </div>
            )}
          </main>

          {activeChatId && (
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
          )}
        </div>
      </div>
      <Dialog open={showTextbooks} onOpenChange={setShowTextbooks}>
        <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto p-0">
          <TextbookUploader programId="jamb" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

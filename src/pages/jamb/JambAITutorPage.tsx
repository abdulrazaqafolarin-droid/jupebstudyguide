import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStudyChat } from "@/hooks/useStudyChat";
import { HistorySidebar } from "@/components/study-chat/HistorySidebar";
import { ThreadView } from "@/components/study-chat/ThreadView";
import { Composer } from "@/components/study-chat/Composer";
import { StudyChatShell } from "@/components/study-chat/StudyChatShell";
import { getJambPublishedQuestionById } from "@/lib/jamb-question-service";
import { JAMB_QUESTION_BANK_SUBJECTS, JAMB_SUBJECT_INFO } from "@/lib/jamb-config";
import { getJambSyllabusSubject, getJambSyllabusTopic, JAMB_SYLLABUS_REVIEW_NOTICE } from "@/lib/jamb-syllabus";
import { findLatestSubjectChat, findLatestTopicChat, type StudyChatMeta } from "@/lib/study-chat";
import { JAMB_TUTOR_PROMPT, JAMB_TUTOR_STARTERS } from "@/lib/jamb-prompts";
import { toast } from "sonner";

function isJambSubject(value: string | null): value is (typeof JAMB_QUESTION_BANK_SUBJECTS)[number] {
  return Boolean(value && JAMB_QUESTION_BANK_SUBJECTS.includes(value as (typeof JAMB_QUESTION_BANK_SUBJECTS)[number]));
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
  const tutorSubjectValue = subject ?? (syllabusSubject ? syllabusSubject.id : undefined);

  const [questionContext, setQuestionContext] = useState("");
  const [questionContextTitle, setQuestionContextTitle] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [input, setInput] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showTextbooks, setShowTextbooks] = useState(searchParams.get("textbooks") === "1");
  const openedTargetChatKeyRef = useRef<string | null>(null);

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

  const createChat = useCallback(async () => {
    const id = await newChat(tutorSubjectValue, syllabusTopic?.id);
    if (id) {
      setInput("");
      setEditingIndex(null);
      setDrawerOpen(false);
    }
    return id;
  }, [newChat, tutorSubjectValue, syllabusTopic?.id]);

  const requestedChatKey = syllabusTopic && tutorSubjectValue
    ? `${tutorSubjectValue}:topic:${syllabusTopic.id}`
    : tutorSubjectValue
      ? `${tutorSubjectValue}:general`
      : "latest";

  // Enter the thread matching the requested subject/topic. A topic link must
  // never silently open an unrelated, most-recent conversation.
  useEffect(() => {
    if (listLoading || openedTargetChatKeyRef.current === requestedChatKey) return;
    openedTargetChatKeyRef.current = requestedChatKey;

    if (syllabusTopic && tutorSubjectValue) {
      const existing = findLatestTopicChat(chats, "jamb", tutorSubjectValue, syllabusTopic.id);
      if (existing) {
        void switchChat(existing.id);
      } else {
        void createChat().then((id) => {
          if (!id) openedTargetChatKeyRef.current = null;
        });
      }
      return;
    }

    if (tutorSubjectValue) {
      const existing = findLatestSubjectChat(chats, "jamb", tutorSubjectValue);
      if (existing) {
        void switchChat(existing.id);
      } else {
        void createChat().then((id) => {
          if (!id) openedTargetChatKeyRef.current = null;
        });
      }
      return;
    }

    if (!activeChatId && chats.length > 0) {
      void switchChat(chats[0].id);
    }
  }, [
    listLoading, requestedChatKey, syllabusTopic, tutorSubjectValue,
    chats, activeChatId, switchChat, createChat,
  ]);

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
    <StudyChatShell
      programId="jamb"
      backTo="/jamb"
      backLabel="Back to JAMB workspace"
      historyLabel="JAMB tutor history"
      title={activeChatMeta?.title ?? "Study Chat"}
      subtitle={
        visibleTutorSubject?.label
          ? `${visibleTutorSubject.label}${visibleTutorTopic ? ` · ${visibleTutorTopic.title}` : ""}`
          : "AI study room"
      }
      sidebar={sidebar}
      isMobile={isMobile}
      drawerOpen={drawerOpen}
      onDrawerOpenChange={setDrawerOpen}
      showTextbooks={showTextbooks}
      onTextbooksOpenChange={setShowTextbooks}
      onNewChat={() => { void createChat(); }}
    >
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
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
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-sm text-muted-foreground">Loading your study chats…</p>
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
            <h2 className="text-lg font-semibold">Start a study room</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Choose a JAMB topic or start a general chat — your conversation is saved automatically.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild className="gap-1.5">
                <Link to="/jamb/syllabus">
                  <BookOpen className="mr-1.5 h-4 w-4" /> Browse syllabus
                </Link>
              </Button>
              <Button variant="outline" onClick={() => { void createChat(); }} className="gap-2">
                <Plus className="h-4 w-4" /> Start a general chat
              </Button>
            </div>
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
              : visibleTutorSubject?.label
                ? `Ask about ${visibleTutorSubject.label}…`
                : "Ask your JAMB tutor…"
          }
          editing={editingIndex !== null}
          onCancelEdit={handleCancelEdit}
        />
      )}
    </StudyChatShell>
  );

}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SUBJECT_INFO } from '@/types/question';
import { useIsMobile } from '@/hooks/use-mobile';
import { useStudyChat } from '@/hooks/useStudyChat';
import { HistorySidebar } from '@/components/study-chat/HistorySidebar';
import { ThreadView } from '@/components/study-chat/ThreadView';
import { Composer } from '@/components/study-chat/Composer';
import { StudyChatShell } from '@/components/study-chat/StudyChatShell';
import { findSyllabusTopic } from '@/lib/study-chat';
import { toast } from 'sonner';

/**
 * Full-page study room (ChatGPT layout): persistent history sidebar on
 * desktop, drawer on mobile, topic-scoped thread in the middle. Entered
 * from /syllabus?topic=… — without params it reopens the most recent chat.
 */
export default function StudyChatPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    chats,
    activeChatId,
    messages,
    isStreaming,
    listLoading,
    streamError,
    activeTopic,
    openTopic,
    switchChat,
    newChat,
    deleteChat,
    renameChat,
    sendMessage,
    sendEdited,
    retry,
    stop,
  } = useStudyChat();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [input, setInput] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showTextbooks, setShowTextbooks] = useState(searchParams.get('textbooks') === '1');

  const topicParam = searchParams.get('topic');
  const subParam = searchParams.get('sub');

  // URL → find-or-create the topic thread. The promise guard makes this
  // idempotent across auth settling and StrictMode double-mounts so two
  // threads are never created for one click.
  const openedRef = useRef<{ key: string; promise: Promise<string | null> } | null>(null);
  useEffect(() => {
    if (!topicParam) return;
    const found = findSyllabusTopic(topicParam);
    if (!found) {
      toast.error('That syllabus topic could not be found.');
      navigate('/syllabus', { replace: true });
      return;
    }
    const key = `${topicParam}|${subParam ?? ''}`;
    if (openedRef.current?.key === key) return;
    openedRef.current = {
      key,
      promise: openTopic(found.topic, found.subject, subParam),
    };
    openedRef.current.promise.then((id) => {
      if (!id && openedRef.current?.key === key) openedRef.current = null;
    });
  }, [topicParam, subParam, openTopic, navigate]);

  // No topic in the URL: reopen the most recent chat if there is one.
  useEffect(() => {
    if (topicParam || listLoading || activeChatId || chats.length === 0) return;
    void switchChat(chats[0].id);
  }, [topicParam, listLoading, activeChatId, chats, switchChat]);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  const handleSend = useCallback((attachment: { base64: string; mimeType: string; name: string } | null) => {
    const text = input.trim();
    if ((!text && !attachment) || isStreaming) return;
    setInput('');
    if (editingIndex !== null) {
      const index = editingIndex;
      setEditingIndex(null);
      void sendEdited(text, index);
    } else {
      void sendMessage(text, attachment);
    }
  }, [input, isStreaming, editingIndex, sendEdited, sendMessage]);

  const handleStarter = useCallback((text: string) => {
    if (isStreaming) return;
    void sendMessage(text);
  }, [isStreaming, sendMessage]);

  const handleEdit = useCallback((index: number, text: string) => {
    setEditingIndex(index);
    setInput(text);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null);
    setInput('');
  }, []);

  const title = activeTopic?.topic.name ?? activeChat?.title ?? 'Study Chat';
  const subtitle = activeTopic
    ? [SUBJECT_INFO[activeTopic.subject]?.name, activeTopic.subtopic]
        .filter(Boolean)
        .join(' · ')
    : 'AI study room';

  const sidebar = (
    <HistorySidebar
      chats={chats}
      activeChatId={activeChatId}
      loading={listLoading}
      onSelect={(id) => {
        void switchChat(id);
        setDrawerOpen(false);
        setEditingIndex(null);
        setInput('');
      }}
      onNewChat={() => {
        void newChat();
        setDrawerOpen(false);
        setEditingIndex(null);
        setInput('');
      }}
      onRename={(id, next) => void renameChat(id, next)}
      onDelete={(id) => void deleteChat(id)}
      onClose={isMobile ? () => setDrawerOpen(false) : undefined}
    />
  );

  return (
    <StudyChatShell
      programId="jupeb"
      backTo="/syllabus"
      backLabel="Back to syllabus"
      historyLabel="Chat history"
      title={title}
      subtitle={subtitle}
      sidebar={sidebar}
      isMobile={isMobile}
      drawerOpen={drawerOpen}
      onDrawerOpenChange={setDrawerOpen}
      showTextbooks={showTextbooks}
      onTextbooksOpenChange={setShowTextbooks}
      onNewChat={() => {
        void newChat();
        setDrawerOpen(false);
        setEditingIndex(null);
        setInput('');
      }}
    >
      {activeChatId ? (
        <>
          <main className="min-h-0 flex-1 overflow-y-auto">
            <ThreadView
              messages={messages}
              isStreaming={isStreaming}
              streamError={streamError}
              editingIndex={editingIndex}
              activeTopic={activeTopic}
              onEdit={handleEdit}
              onRetry={() => void retry()}
              onStarter={handleStarter}
            />
          </main>
          <Composer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onStop={stop}
            isStreaming={isStreaming}
            placeholder={
              activeTopic
                ? `Ask about ${activeTopic.subtopic ?? activeTopic.topic.name}…`
                : 'Ask me anything about your studies…'
            }
            editing={editingIndex !== null}
            onCancelEdit={handleCancelEdit}
          />
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          {listLoading ? (
            <p className="text-sm text-muted-foreground">Loading your study chats…</p>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Start a study room</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                Open any topic or subtopic from your syllabus and study it with your AI tutor —
                your conversation is saved automatically.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => navigate('/syllabus')} className="gap-1.5">
                  <BookOpen className="h-4 w-4" /> Browse syllabus
                </Button>
                <Button variant="outline" className="gap-1.5" onClick={() => void newChat()}>
                  <Plus className="h-4 w-4" /> Start a general chat
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </StudyChatShell>
  );

}

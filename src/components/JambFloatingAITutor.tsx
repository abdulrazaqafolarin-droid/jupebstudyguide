import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, MessageCircle, Plus, ChevronLeft, X, Minimize2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudyChat } from "@/hooks/useStudyChat";
import { HistorySidebar } from "@/components/study-chat/HistorySidebar";
import { ThreadView } from "@/components/study-chat/ThreadView";
import { Composer } from "@/components/study-chat/Composer";
import { JAMB_TUTOR_PROMPT, JAMB_TUTOR_STARTERS } from "@/lib/jamb-prompts";

export function JambFloatingAITutor() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const {
    chats, activeChatId, messages, isStreaming, listLoading, streamError,
    activeTopic, switchChat, newChat, deleteChat, renameChat, sendMessage,
    sendEdited, retry, stop,
  } = useStudyChat("jamb", JAMB_TUTOR_PROMPT);

  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? null;

  useEffect(() => {
    if (!isOpen || listLoading || activeChatId || chats.length === 0) return;
    void switchChat(chats[0].id);
  }, [isOpen, listLoading, activeChatId, chats, switchChat]);

  const close = useCallback(() => {
    setIsOpen(false); setIsMinimized(false); setShowHistory(false); setEditingIndex(null);
  }, []);

  const createNewChat = useCallback(async () => {
    setInput(""); setEditingIndex(null);
    const id = await newChat();
    if (id) setShowHistory(false);
  }, [newChat]);

  const selectChat = useCallback((id: string) => {
    void switchChat(id); setShowHistory(false); setEditingIndex(null); setInput("");
  }, [switchChat]);

  const send = useCallback(async (attachment: { base64: string; mimeType: string; name: string } | null) => {
    const text = input.trim();
    if ((!text && !attachment) || isStreaming) return;
    setInput("");
    if (editingIndex !== null) {
      const index = editingIndex; setEditingIndex(null); await sendEdited(text, index); return;
    }
    if (!activeChatId) {
      const id = await newChat();
      if (!id) return;
    }
    await sendMessage(text, attachment);
  }, [input, isStreaming, editingIndex, activeChatId, sendEdited, newChat, sendMessage]);

  const sendStarter = useCallback(async (prompt: string) => {
    if (isStreaming) return;
    if (!activeChatId) {
      const id = await newChat();
      if (!id) return;
    }
    await sendMessage(prompt);
  }, [isStreaming, activeChatId, newChat, sendMessage]);

  const sidebar = (
    <HistorySidebar
      chats={chats}
      activeChatId={activeChatId}
      loading={listLoading}
      onSelect={selectChat}
      onNewChat={() => { void createNewChat(); }}
      onRename={(id, title) => { void renameChat(id, title); }}
      onDelete={(id) => { void deleteChat(id); }}
      onClose={() => setShowHistory(false)}
    />
  );

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            type="button" aria-label="Open AI tutor" title="Open AI tutor"
            onClick={() => setIsOpen(true)}
            drag
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={{
              left: typeof window !== "undefined" ? -(window.innerWidth - 72) : -1000,
              right: 0,
              top: typeof window !== "undefined" ? -(window.innerHeight - 140) : -700,
              bottom: 0,
            }}
            initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }} whileTap={{ scale: 0.94 }} whileDrag={{ scale: 1.04 }}
            className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 cursor-grab items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30 transition-shadow hover:shadow-xl hover:shadow-primary/40 active:cursor-grabbing"
          >
            <motion.span
              className="absolute inset-0 rounded-full"
              animate={{ boxShadow: ["0 0 0 0 hsla(38, 92%, 50%, 0.3)", "0 0 0 16px hsla(38, 92%, 50%, 0)"] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
            />
            <MessageCircle className="relative z-10 h-6 w-6" />
            <span className="absolute -right-0.5 -top-0.5 z-10 h-3.5 w-3.5 rounded-full border-2 border-background bg-green-500" />
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.button type="button" aria-label="Close AI tutor" onClick={close}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 md:hidden" />
            <motion.section role="dialog" aria-modal="true" aria-label="AI tutor"
              initial={{ opacity: 0, scale: 0.92, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className={[
                "fixed z-[70] flex w-full flex-col overflow-hidden border border-border bg-card/95 shadow-2xl backdrop-blur-xl",
                "inset-0 h-[100dvh] rounded-none",
                "md:inset-auto md:bottom-[calc(5.25rem+env(safe-area-inset-bottom))] md:right-4 md:w-[400px]",
                isMinimized ? "md:h-auto" : "md:h-[540px] md:max-h-[calc(100dvh-7rem)]",
                "md:rounded-2xl",
              ].join(" ")}
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-gradient-to-r from-primary/[0.08] via-accent/[0.06] to-transparent p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20"><Bot className="h-4 w-4 text-primary" /></div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{activeChat?.title || "AI Tutor"}</h3>
                    <p className="text-[10px] text-muted-foreground">Ask anything about your studies</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!isMinimized && (
                    <>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Chat history" title="Chat history" onClick={() => setShowHistory((v) => !v)}>
                        <ChevronLeft className={["h-4 w-4 transition-transform", showHistory ? "rotate-180" : ""].join(" ")} />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="New chat" title="New chat" onClick={() => { void createNewChat(); }}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="hidden h-7 w-7 md:inline-flex" aria-label="Open full tutor" title="Open full tutor" onClick={() => { close(); navigate("/jamb/ai"); }}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button type="button" variant="ghost" size="icon" className="hidden h-7 w-7 md:inline-flex"
                    aria-label={isMinimized ? "Expand tutor" : "Minimize tutor"} title={isMinimized ? "Expand" : "Minimize"}
                    onClick={() => setIsMinimized((v) => !v)}>
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Close tutor" title="Close" onClick={close}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {!isMinimized && (
                <div className="flex min-h-0 flex-1 flex-col">
                  {showHistory ? <div className="min-h-0 flex-1 overflow-y-auto">{sidebar}</div>
                    : listLoading ? <div className="flex flex-1 items-center justify-center"><div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
                    : activeChatId ? (
                      <>
                        <main className="min-h-0 flex-1 overflow-y-auto">
                          <ThreadView messages={messages} isStreaming={isStreaming} streamError={streamError}
                            editingIndex={editingIndex} activeTopic={activeTopic}
                            onEdit={(index, text) => { setEditingIndex(index); setInput(text); }}
                            onRetry={() => { void retry(); }}
                            onStarter={(prompt) => { void sendStarter(prompt); }}
                            starterPrompts={JAMB_TUTOR_STARTERS} />
                        </main>
                        <Composer value={input} onChange={setInput} onSend={(attachment) => { void send(attachment); }}
                          onStop={stop} isStreaming={isStreaming} placeholder="Ask me anything…"
                          editing={editingIndex !== null} onCancelEdit={() => { setEditingIndex(null); setInput(""); }} />
                      </>
                    ) : (
                      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15"><MessageCircle className="h-6 w-6 text-primary" /></div>
                        <h4 className="text-sm font-semibold">How can I help you today?</h4>
                        <div className="grid w-full grid-cols-2 gap-2">
                          {JAMB_TUTOR_STARTERS.map((prompt) => (
                            <button key={prompt} type="button" onClick={() => { void sendStarter(prompt); }}
                              className="rounded-lg border border-border bg-background/70 p-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground">{prompt}</button>
                          ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => { void createNewChat(); }}><Plus className="mr-1.5 h-4 w-4" /> New chat</Button>
                      </div>
                    )}
                </div>
              )}
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

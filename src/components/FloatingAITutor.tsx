import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import MathRenderer from './MathRenderer';
import { useAttachment } from '@/hooks/useAttachment';
import { useAITutorChats, AIMessage } from '@/hooks/useAITutorChats';
import { useAuth } from '@/contexts/AuthContext';
import {
  Bot, Send, Sparkles, X, Lightbulb, HelpCircle,
  BookOpen, Loader2, MessageCircle, Minimize2,
  Plus, Image, FileText, Trash2, ChevronLeft,
  Copy, Pencil, Library
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { streamChat as aiStreamChat } from '@/lib/ai-service';
import { TUTOR_SYSTEM_PROMPT, GENERAL_CHAT_PROMPT } from '@/lib/prompts';
import { searchRelevantChunks, getTextbookCount } from '@/lib/rag';
import { TextbookUploader } from './TextbookUploader';

const QUICK_PROMPTS = [
  { icon: HelpCircle, text: "Explain a concept", prompt: "I need help understanding a concept. Let me describe it..." },
  { icon: Lightbulb, text: "Study tips", prompt: "Give me effective study tips for JUPEB preparation." },
  { icon: BookOpen, text: "Syllabus help", prompt: "Help me understand what topics I should focus on for my exams." },
  { icon: Sparkles, text: "Practice question", prompt: "Give me a practice question to test my knowledge." },
];

export const FloatingAITutor = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showChatList, setShowChatList] = useState(false);

  const {
    chats, activeChatId, messages, setMessages,
    switchChat, newChat, deleteChat,
    saveUserMessage, saveAssistantMessage,
  } = useAITutorChats();

  const activeChat = chats.find(c => c.id === activeChatId);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTextbooks, setShowTextbooks] = useState(false);
  const [textbookCount, setTextbookCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assistantContentRef = useRef('');
  const fabRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const clickPrevented = useRef(false);

  const [fabPos, setFabPosRaw] = useState(() => {
    try {
      const raw = localStorage.getItem('jupeb-ai-fab-pos');
      if (raw) return JSON.parse(raw);
    } catch { /* invalid stored pos */ }
    return { x: window.innerWidth - 80, y: window.innerHeight - 80 };
  });
  const setFabPos = useCallback((pos: { x: number; y: number }) => {
    setFabPosRaw(pos);
    try { localStorage.setItem('jupeb-ai-fab-pos', JSON.stringify(pos)); } catch { /* quota exceeded */ }
  }, []);
  const renderPos = useRef(fabPos);
  const [isDragging, setIsDragging] = useState(false);

  const { attachment, isProcessing, addAttachment, clearAttachment } = useAttachment();

  const copyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  }, []);

  const editMessage = useCallback((index: number, content: string) => {
    setInput(content);
    setMessages(prev => prev.filter((_, i) => i !== index));
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [setMessages]);

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  const computePanelOrigin = useCallback((): { top: number; left: number; width: number } => {
    const fabSize = 56;
    const gap = 10;
    const pw = 400;
    const ph = Math.min(540, window.innerHeight - 100);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 16;
    let top: number;
    const spaceAbove = fabPos.y - pad;
    const spaceBelow = vh - (fabPos.y + fabSize) - pad;
    if (spaceAbove >= ph) {
      top = fabPos.y - ph - gap;
    } else if (spaceBelow >= ph) {
      top = fabPos.y + fabSize + gap;
    } else {
      top = clamp((vh - ph) / 2, pad, vh - ph - pad);
    }
    const spaceLeft = fabPos.x - pad;
    const spaceRight = vw - (fabPos.x + fabSize) - pad;
    let left: number;
    if (spaceLeft >= pw) {
      left = fabPos.x - pw - gap;
    } else if (spaceRight >= pw) {
      left = fabPos.x + fabSize + gap;
    } else {
      left = clamp((vw - pw) / 2, pad, vw - pw - pad);
    }
    return { top: clamp(top, pad, vh - ph - pad), left: clamp(left, pad, vw - pw - pad), width: pw };
  }, [fabPos]);

  useEffect(() => { renderPos.current = fabPos; }, [fabPos]);

  const handleFabPointerDown = useCallback((e: React.PointerEvent) => {
    clickPrevented.current = false;
    dragRef.current = {
      isDragging: false,
      startX: e.clientX,
      startY: e.clientY,
      originX: fabPos.x,
      originY: fabPos.y,
    };
    fabRef.current?.setPointerCapture(e.pointerId);
  }, [fabPos]);

  const handleFabPointerMove = useCallback((e: React.PointerEvent) => {
    const el = fabRef.current;
    if (!el) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (!dragRef.current.isDragging && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      dragRef.current.isDragging = true;
      clickPrevented.current = true;
      el.style.transition = 'none';
      setIsDragging(true);
    }
    if (dragRef.current.isDragging) {
      const nx = dragRef.current.originX + dx;
      const ny = dragRef.current.originY + dy;
      renderPos.current = { x: nx, y: ny };
      el.style.left = `${nx}px`;
      el.style.top = `${ny}px`;
    }
  }, []);

  const handleFabPointerUp = useCallback((e: React.PointerEvent) => {
    const el = fabRef.current;
    if (dragRef.current.isDragging) {
      const btnSize = 56;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const thresh = 40;
      const pad = 12;
      let fx = clamp(renderPos.current.x, 0, vw - btnSize);
      let fy = clamp(renderPos.current.y, 0, vh - btnSize);
      if (fx < thresh) fx = pad;
      else if (fx + btnSize > vw - thresh) fx = vw - btnSize - pad;
      if (fy < thresh) fy = pad;
      else if (fy + btnSize > vh - thresh) fy = vh - btnSize - pad;
      if (el) {
        el.style.transition = 'left 0.25s cubic-bezier(0.23,1,0.32,1), top 0.25s cubic-bezier(0.23,1,0.32,1)';
        el.style.left = `${fx}px`;
        el.style.top = `${fy}px`;
      }
      setFabPos({ x: fx, y: fy });
      setTimeout(() => { if (el) el.style.transition = ''; }, 300);
      setIsDragging(false);
    }
    dragRef.current.isDragging = false;
  }, [setFabPos]);

  useEffect(() => {
    if (scrollRef.current) {
      const vp = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
      (vp || scrollRef.current).scrollTop = (vp || scrollRef.current).scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && !showChatList && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized, showChatList]);

  const handleStreamChat = useCallback(async (userMessage: string) => {
    if (!activeChatId) return;
    const chatId = activeChatId;
    const userMsg: AIMessage = {
      role: 'user',
      content: userMessage,
      attachment: attachment ? { base64: attachment.base64, mimeType: attachment.mimeType, name: attachment.name } : null,
    };

    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setIsLoading(true);
    setInput('');
    clearAttachment();
    assistantContentRef.current = '';

    saveUserMessage(chatId, userMsg).catch(console.error);

    const systemPrompt = TUTOR_SYSTEM_PROMPT + "\n\n" + GENERAL_CHAT_PROMPT;

    let ragContext = "";
    try {
      ragContext = await searchRelevantChunks(userMessage);
    } catch (e) { console.warn('RAG search failed:', e); }

    let acc = '';
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    await aiStreamChat(systemPrompt, newMsgs, {
      onDelta: (text) => {
        acc += text;
        assistantContentRef.current = acc;
        setMessages(prev => {
          const arr = [...prev];
          if (arr.length && arr[arr.length - 1].role === 'assistant') {
            arr[arr.length - 1] = { role: 'assistant', content: acc };
          }
          return arr;
        });
      },
      onDone: async () => {
        if (assistantContentRef.current) {
          try {
            await saveAssistantMessage(chatId, assistantContentRef.current);
          } catch {
            console.warn('Save failed - chat may have been deleted during streaming');
          }
        }
        setIsLoading(false);
      },
      onError: (err) => {
        toast.error(err);
        setIsLoading(false);
      },
    }, ragContext);
  }, [activeChatId, attachment, messages, setMessages, clearAttachment, saveUserMessage, saveAssistantMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || isLoading) return;
    handleStreamChat(input.trim() || (attachment ? `[Attached: ${attachment.name}]` : ''));
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return;
    handleStreamChat(prompt);
  };

  const handleClose = () => {
    setIsOpen(false); setIsMinimized(false); setShowChatList(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addAttachment(file);
    e.target.value = '';
  };

  useEffect(() => {
    getTextbookCount().then(setTextbookCount).catch((e) => console.warn('Failed to get textbook count:', e));
  }, [showTextbooks]);

  // Hide entirely when not signed in (no anonymous chats).
  if (!user) return null;

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            ref={fabRef}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: isDragging ? 1.15 : 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            whileHover={{ scale: isDragging ? 1.15 : 1.1 }}
            onPointerDown={handleFabPointerDown}
            onPointerMove={handleFabPointerMove}
            onPointerUp={(e) => {
              handleFabPointerUp(e);
              if (!clickPrevented.current) setIsOpen(true);
            }}
            style={{ left: renderPos.current.x, top: renderPos.current.y, touchAction: 'none' }}
            className={cn(
              "fixed z-50 w-14 h-14 rounded-full",
              "bg-gradient-to-br from-primary to-accent flex items-center justify-center",
              isDragging
                ? "shadow-2xl shadow-primary/50 cursor-grabbing scale-110 ring-2 ring-primary/30"
                : "shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 cursor-grab"
            )}
          >
            <MessageCircle className="w-6 h-6 text-primary-foreground" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "fixed z-50",
          "max-w-[calc(100vw-3rem)]",
          isMinimized ? "h-auto" : "h-[540px] max-h-[calc(100vh-6rem)]",
          "bg-card rounded-2xl border border-border shadow-2xl shadow-black/20",
          "flex flex-col overflow-hidden transition-[opacity,transform] duration-200",
          isOpen ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" : "opacity-0 translate-y-8 scale-95 pointer-events-none"
        )}
        style={computePanelOrigin()}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between p-3 bg-gradient-to-r from-primary/10 to-accent/10 shrink-0",
            isMinimized ? "cursor-pointer hover:bg-primary/5 rounded-2xl" : "border-b border-border"
          )}
          onClick={() => isMinimized && setIsMinimized(false)}
        >
          <div className="flex items-center gap-2 min-w-0">
            {showChatList && !isMinimized ? (
              <h3 className="font-semibold text-sm text-foreground">Chat History</h3>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">{activeChat?.title || 'AI Tutor'}</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {isMinimized ? 'Click to expand' : 'Ask anything about your studies'}
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {!isMinimized && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowChatList(!showChatList)} title="Chat history">
                  <ChevronLeft className={cn("w-4 h-4 transition-transform", showChatList && "rotate-180")} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => newChat()} title="New chat">
                  <Plus className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 relative" onClick={() => setShowTextbooks(true)} title="Textbooks">
                  <Library className="w-4 h-4" />
                  {textbookCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center text-[7px] text-primary-foreground font-bold">
                      {textbookCount}
                    </span>
                  )}
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMinimized(!isMinimized)} title={isMinimized ? "Expand" : "Minimize"}>
              <Minimize2 className={cn("w-4 h-4 transition-transform", isMinimized && "rotate-180")} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClose} title="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {showChatList ? (
              <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                  {chats.map(chat => (
                    <div
                      key={chat.id}
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors group",
                        chat.id === activeChatId ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary/50"
                      )}
                      onClick={() => { switchChat(chat.id); setShowChatList(false); }}
                    >
                      <MessageCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{chat.title}</p>
                      </div>
                      {chats.length > 1 && (
                        <Button
                          variant="ghost" size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <>
                {/* Messages — fixed-width container so user bubbles stay anchored right and never shift */}
                <ScrollArea className="flex-1 p-3 w-full overflow-x-hidden [&_[data-radix-scroll-area-viewport]]:overflow-x-hidden" ref={scrollRef}>
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-2">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <Sparkles className="w-6 h-6 text-primary" />
                      </div>
                      <h4 className="text-sm font-semibold mb-1">How can I help you today?</h4>
                      <p className="text-xs text-muted-foreground mb-4">
                        Ask questions, get study tips, or attach documents
                      </p>
                      <div className="grid grid-cols-2 gap-2 w-full">
                        {QUICK_PROMPTS.map((item, i) => (
                          <button
                            key={i}
                            onClick={() => handleQuickPrompt(item.prompt)}
                            disabled={isLoading}
                            className={cn(
                              "flex items-center gap-1.5 p-2 rounded-lg border border-border",
                              "text-left text-xs transition-all",
                              "hover:bg-primary/5 hover:border-primary/30",
                              "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                          >
                            <item.icon className="w-3 h-3 text-primary shrink-0" />
                            <span className="line-clamp-1">{item.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 w-full">
                      {messages.map((msg, i) => (
                        <div
                          key={msg.id || `msg-${i}`}
                          className={cn(
                            "flex gap-2 w-full",
                            msg.role === 'user' ? "justify-end" : "justify-start"
                          )}
                        >
                          {msg.role === 'assistant' && (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-primary/20">
                              <Bot className="w-3 h-3 text-primary" />
                            </div>
                          )}
                          <div
                            className={cn(
                              "rounded-xl px-3 py-2 min-w-0 relative group",
                              "max-w-[85%]",
                              msg.role === 'assistant'
                                ? "bg-secondary/50 text-foreground"
                                : "bg-primary text-primary-foreground"
                            )}
                            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                          >
                            {msg.attachment && (
                              <div className="flex items-center gap-1 mb-1 text-[10px] opacity-75">
                                {msg.attachment.mimeType.startsWith('image/') ? <Image className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                <span className="truncate">{msg.attachment.name}</span>
                              </div>
                            )}
                            {msg.role === 'assistant' ? (
                              <div className="prose prose-sm prose-invert max-w-full min-w-0 break-words [overflow-wrap:anywhere]">
                                <MathRenderer content={msg.content} className="text-xs leading-relaxed" />
                              </div>
                            ) : (
                              <p className="text-xs whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.content}</p>
                            )}
                            {msg.content && (
                              <div
                                className={cn(
                                  "absolute -top-2 right-1 flex items-center gap-0.5",
                                  "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                                  "bg-background/90 backdrop-blur-sm rounded-md px-1 py-0.5 shadow-sm border border-border/50"
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={() => copyMessage(msg.content!)}
                                  className="p-0.5 rounded hover:bg-secondary transition-colors"
                                  title="Copy message"
                                >
                                  <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                                </button>
                                {msg.role === 'user' && (
                                  <button
                                    type="button"
                                    onClick={() => editMessage(i, msg.content!)}
                                    className="p-0.5 rounded hover:bg-secondary transition-colors"
                                    title="Edit message"
                                  >
                                    <Pencil className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          {msg.role === 'user' && (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-secondary">
                              <span className="text-[10px]">You</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                        <div className="flex gap-2 justify-start">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <Bot className="w-3 h-3 text-primary" />
                          </div>
                          <div className="bg-secondary/50 rounded-xl px-3 py-2">
                            <Loader2 className="w-3 h-3 animate-spin text-primary" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>

                {attachment && (
                  <div className="px-3 py-1.5 border-t border-border bg-secondary/30 flex items-center gap-2">
                    {attachment.preview ? (
                      <img src={attachment.preview} alt="" className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                    )}
                    <span className="text-xs truncate flex-1">{attachment.name}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={clearAttachment}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-background/50 shrink-0">
                  <div className="flex gap-2 items-end">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading || isProcessing}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        "bg-primary/10 hover:bg-primary/20 text-primary transition-colors",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                      title="Attach file"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </button>
                    <Textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      }}
                      placeholder={attachment ? "Describe what you need help with..." : "Ask me anything..."}
                      className="min-h-[40px] max-h-[80px] resize-none text-sm flex-1 min-w-0"
                      rows={1}
                      disabled={isLoading}
                    />
                    <Button
                      type="submit" size="sm"
                      disabled={(!input.trim() && !attachment) || isLoading}
                      className="shrink-0 h-8 w-8"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </>
        )}
      </div>

      {showTextbooks && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowTextbooks(false)}>
          <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <TextbookUploader onClose={() => setShowTextbooks(false)} />
          </div>
        </div>
      )}
    </>
  );
};

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
  Copy, Pencil, Library, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, animate, useMotionValue, useMotionValueEvent, type PanInfo } from 'framer-motion';
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

const springPanel = { type: "spring" as const, stiffness: 320, damping: 28, mass: 0.85 };
const springMessage = { type: "spring" as const, stiffness: 220, damping: 26, mass: 0.8 };

const messageVariants = {
  initial: { opacity: 0, y: 14, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.96 }
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.05, delayChildren: 0.08 }
  }
};

const staggerItem = {
  initial: { opacity: 0, y: 10, scale: 0.95 },
  animate: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", stiffness: 200, damping: 24 }
  }
};

const BTN_SIZE = 56;
const FRICTION = 0.96;
const MOMENTUM_VEL_THRESHOLD = 0.8;
const SNAP_SPRING = { type: "spring" as const, stiffness: 220, damping: 22, mass: 0.85 };

function findNearestCorner(x: number, y: number, btnSize: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = x + btnSize / 2;
  const cy = y + btnSize / 2;
  const corners = [
    { x: 0, y: 0 },
    { x: vw - btnSize, y: 0 },
    { x: 0, y: vh - btnSize },
    { x: vw - btnSize, y: vh - btnSize },
  ];
  let best = corners[0];
  let bestDist = Infinity;
  for (const c of corners) {
    const dx = cx - (c.x + btnSize / 2);
    const dy = cy - (c.y + btnSize / 2);
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) { bestDist = dist; best = c; }
  }
  return best;
}

const TypingDots = () => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-1 px-1"
  >
    {[0, 1, 2].map(i => (
      <motion.span
        key={i}
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
        className="w-1.5 h-1.5 rounded-full bg-primary/60"
      />
    ))}
  </motion.div>
);

function getInitialPosition() {
  try {
    const raw = localStorage.getItem('jupeb-ai-fab-pos');
    if (raw) {
      const pos = JSON.parse(raw);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      pos.x = Math.min(Math.max(pos.x, 0), vw - BTN_SIZE);
      pos.y = Math.min(Math.max(pos.y, 0), vh - BTN_SIZE);
      return pos;
    }
  } catch {}
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return { x: vw - 80, y: vh - 80 };
}

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
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assistantContentRef = useRef('');
  const fabRef = useRef<HTMLDivElement>(null);

  const initialPos = getInitialPosition();
  const x = useMotionValue(initialPos.x);
  const y = useMotionValue(initialPos.y);
  const posRef = useRef({ x: initialPos.x, y: initialPos.y });

  useMotionValueEvent(x, "change", (latest) => { posRef.current.x = latest; });
  useMotionValueEvent(y, "change", (latest) => { posRef.current.y = latest; });

  const [fabPos, setFabPosRaw] = useState(() => ({ x: initialPos.x, y: initialPos.y }));
  const setFabPos = useCallback((pos: { x: number; y: number }) => {
    setFabPosRaw(pos);
    try { localStorage.setItem('jupeb-ai-fab-pos', JSON.stringify(pos)); } catch {}
  }, []);

  const [isSettling, setIsSettling] = useState(false);
  const [settleWobble, setSettleWobble] = useState(0);
  const settlingRef = useRef(false);
  const momentumRAF = useRef(0);
  const momentumVel = useRef({ vx: 0, vy: 0 });
  const animating = useRef(false);

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
    const pw = 400;
    const ph = Math.min(540, window.innerHeight - 100);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 16;
    const fabCx = fabPos.x + BTN_SIZE / 2;
    const fabCy = fabPos.y + BTN_SIZE / 2;
    const nearLeft = fabCx < vw / 2;
    const nearTop = fabCy < vh / 2;
    const minLeft = pad;
    const maxLeft = Math.max(pad, vw - pw - pad);
    const minTop = pad;
    const maxTop = Math.max(pad, vh - ph - pad);
    let left = clamp(nearLeft ? vw - pw - pad : pad, minLeft, maxLeft);
    let top = clamp(nearTop ? vh - ph - pad : pad, minTop, maxTop);
    return { top, left, width: pw };
  }, [fabPos]);

  const computeOriginPct = useCallback((): { x: number; y: number } => {
    const origin = computePanelOrigin();
    const fabCx = fabPos.x + BTN_SIZE / 2;
    const fabCy = fabPos.y + BTN_SIZE / 2;
    const panelH = Math.min(540, window.innerHeight - 100);
    const relX = ((fabCx - origin.left) / origin.width) * 100;
    const relY = ((fabCy - origin.top) / panelH) * 100;
    return {
      x: clamp(relX, 0, 100),
      y: clamp(relY, 0, 100),
    };
  }, [fabPos, computePanelOrigin]);

  const snapToCorner = useCallback(() => {
    const unlock = () => {
      settlingRef.current = false;
      setIsSettling(false);
      animating.current = false;
    };

    if (animating.current) { unlock(); return; }

    const currentPos = posRef.current;
    const target = findNearestCorner(currentPos.x, currentPos.y, BTN_SIZE);
    const dx = Math.abs(currentPos.x - target.x);
    const dy = Math.abs(currentPos.y - target.y);

    if (dx < 1 && dy < 1) {
      unlock();
      setFabPos({ x: target.x, y: target.y });
      setSettleWobble(k => k + 1);
      return;
    }

    settlingRef.current = true;
    setIsSettling(true);
    animating.current = true;

    const safetyTimer = setTimeout(unlock, 3000);

    Promise.all([
      animate(x, target.x, SNAP_SPRING),
      animate(y, target.y, SNAP_SPRING),
    ]).then(() => {
      clearTimeout(safetyTimer);
      unlock();
      setFabPos({ x: target.x, y: target.y });
      setSettleWobble(k => k + 1);
    });
  }, [x, y, setFabPos]);

  const runMomentum = useCallback(() => {
    if (!momentumRAF.current) return;

    const currentX = x.get();
    const currentY = y.get();
    let vx = momentumVel.current.vx * FRICTION;
    let vy = momentumVel.current.vy * FRICTION;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let nx = currentX + vx;
    let ny = currentY + vy;

    if (nx < 0) { nx = 0; vx = -vx * 0.5; }
    else if (nx + BTN_SIZE > vw) { nx = vw - BTN_SIZE; vx = -vx * 0.5; }
    if (ny < 0) { ny = 0; vy = -vy * 0.5; }
    else if (ny + BTN_SIZE > vh) { ny = vh - BTN_SIZE; vy = -vy * 0.5; }

    x.set(nx);
    y.set(ny);
    momentumVel.current = { vx, vy };

    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > MOMENTUM_VEL_THRESHOLD) {
      momentumRAF.current = requestAnimationFrame(runMomentum);
    } else {
      momentumRAF.current = 0;
      snapToCorner();
    }
  }, [x, y, snapToCorner]);

  const handleFabTap = useCallback(() => {
    if (settlingRef.current) return;
    setFabPos({ x: posRef.current.x, y: posRef.current.y });
    setIsOpen(true);
  }, [setFabPos]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    settlingRef.current = false;
    setIsSettling(false);
    animating.current = false;
    if (momentumRAF.current) {
      cancelAnimationFrame(momentumRAF.current);
      momentumRAF.current = 0;
    }

    const vx = info.velocity.x;
    const vy = info.velocity.y;
    const speed = Math.sqrt(vx * vx + vy * vy);

    if (speed > MOMENTUM_VEL_THRESHOLD) {
      momentumVel.current = { vx: vx / 60, vy: vy / 60 };
      settlingRef.current = true;
      setIsSettling(true);
      momentumRAF.current = requestAnimationFrame(runMomentum);
    } else {
      snapToCorner();
    }
  }, [runMomentum, snapToCorner]);

  useEffect(() => {
    setFabPos({ x: posRef.current.x, y: posRef.current.y });
    const target = findNearestCorner(posRef.current.x, posRef.current.y, BTN_SIZE);
    const dx = Math.abs(posRef.current.x - target.x);
    const dy = Math.abs(posRef.current.y - target.y);
    if (dx > 1 || dy > 1) {
      animate(x, target.x, { type: "spring", stiffness: 250, damping: 26, mass: 0.8 });
      animate(y, target.y, { type: "spring", stiffness: 250, damping: 26, mass: 0.8 });
    }
    setFabPos({ x: target.x, y: target.y });

    const handleResize = () => {
      if (momentumRAF.current) {
        cancelAnimationFrame(momentumRAF.current);
        momentumRAF.current = 0;
      }
      const currentX = x.get();
      const currentY = y.get();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const clampedX = Math.min(Math.max(currentX, 0), vw - BTN_SIZE);
      const clampedY = Math.min(Math.max(currentY, 0), vh - BTN_SIZE);
      const resizeTarget = findNearestCorner(clampedX, clampedY, BTN_SIZE);
      animate(x, resizeTarget.x, { type: "spring", stiffness: 250, damping: 26, mass: 0.8 });
      animate(y, resizeTarget.y, { type: "spring", stiffness: 250, damping: 26, mass: 0.8 });
      setFabPos({ x: resizeTarget.x, y: resizeTarget.y });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (momentumRAF.current) {
        cancelAnimationFrame(momentumRAF.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = useCallback((smooth = false) => {
    const vp = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (vp) {
      if (smooth) vp.scrollTo({ top: vp.scrollHeight, behavior: 'smooth' });
      else vp.scrollTop = vp.scrollHeight;
    } else if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (!el) return;
    const onScroll = () => {
      setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const vp = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    const target = vp || scrollRef.current;
    if (!target) return;
    if (isAtBottom || !vp) {
      target.scrollTop = target.scrollHeight;
    }
  }, [messages, isAtBottom]);

  useEffect(() => {
    if (!isOpen || isMinimized || showChatList || !inputRef.current) return;
    const id = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(id);
  }, [isOpen, isMinimized, showChatList]);

  const showTyping = isLoading && (
    messages.length === 0 ||
    messages[messages.length - 1]?.role === 'user' ||
    (messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content)
  );

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
    let firstToken = true;

    await aiStreamChat(systemPrompt, newMsgs, {
      onDelta: (text) => {
        if (firstToken) {
          firstToken = false;
          setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
        }
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
        if (!firstToken && assistantContentRef.current) {
          try {
            await saveAssistantMessage(chatId, assistantContentRef.current);
          } catch {
            console.warn('Save failed - chat may have been deleted during streaming');
          }
        }
        setIsLoading(false);
      },
      onError: (err) => {
        if (firstToken) {
          setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
        }
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

  if (!user) return null;

  const panelOrigin = computePanelOrigin();
  const originPct = computeOriginPct();

  return (
    <>
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.div
            key="fab"
            ref={fabRef}
            drag
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={{
              left: 0,
              right: typeof window !== 'undefined' ? window.innerWidth - BTN_SIZE : 1000,
              top: 0,
              bottom: typeof window !== 'undefined' ? window.innerHeight - BTN_SIZE : 1000,
            }}
            onDragEnd={handleDragEnd}
            onTap={handleFabTap}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              rotate: settleWobble > 0 ? [0, -8, 5, -3, 1, 0] : 0,
            }}
            exit={{ scale: 0.85, opacity: 0, transition: { duration: 0.15 } }}
            transition={{
              scale: { type: "spring", stiffness: 300, damping: 20 },
              opacity: { duration: 0.2 },
              rotate: settleWobble > 0 ? { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0 },
            }}
            onAnimationComplete={() => {
              if (settleWobble > 0) setSettleWobble(0);
            }}
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              x,
              y,
              zIndex: 50,
              touchAction: 'none',
              willChange: 'transform',
            }}
            className={cn(
              "w-14 h-14 rounded-full",
              "bg-gradient-to-br from-primary to-accent",
              "flex items-center justify-center",
              isSettling
                ? "shadow-2xl shadow-primary/60"
                : "shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40",
              "cursor-grab active:cursor-grabbing"
            )}
          >
            <motion.span
              className="absolute inset-0 rounded-full"
              animate={{
                boxShadow: isSettling
                  ? ["0 0 0 0 hsla(38, 92%, 50%, 0.5)", "0 0 0 20px hsla(38, 92%, 50%, 0)"]
                  : ["0 0 0 0 hsla(38, 92%, 50%, 0.3)", "0 0 0 16px hsla(38, 92%, 50%, 0)"],
              }}
              transition={{
                duration: isSettling ? 0.5 : 2.2,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
            <MessageCircle className="w-6 h-6 text-primary-foreground relative z-10" />
            <motion.span
              className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background z-10"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.85, 1],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="panel"
            custom={originPct}
            initial={{ opacity: 0, scale: 0.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.06 }}
            transition={{
              scale: { type: "spring", stiffness: 350, damping: 30, mass: 0.9 },
              opacity: { duration: 0.2 },
            }}
            style={{
              position: 'fixed',
              top: panelOrigin.top,
              left: panelOrigin.left,
              width: panelOrigin.width,
              zIndex: 50,
              transformOrigin: `${originPct.x}% ${originPct.y}%`,
            }}
            className={cn(
              "max-w-[calc(100vw-3rem)]",
              isMinimized ? "h-auto" : "h-[540px] max-h-[calc(100vh-6rem)]",
              "bg-card/90 backdrop-blur-xl",
              "rounded-2xl border border-white/10",
              "shadow-2xl shadow-black/30",
              "flex flex-col overflow-hidden"
            )}
          >
            <StaggerContent delay={0.12}>
              <div
                className={cn(
                  "flex items-center justify-between p-3 shrink-0",
                  "bg-gradient-to-r from-primary/[0.08] via-accent/[0.06] to-transparent",
                  "border-b border-white/5",
                  isMinimized ? "cursor-pointer" : ""
                )}
                onClick={() => isMinimized && setIsMinimized(false)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {showChatList && !isMinimized ? (
                    <h3 className="font-semibold text-sm text-foreground">Chat History</h3>
                  ) : (
                    <>
                      <motion.div
                        className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0"
                        whileHover={{ rotate: 15 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15 }}
                      >
                        <Bot className="w-4 h-4 text-primary" />
                      </motion.div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-foreground truncate">{activeChat?.title || 'AI Tutor'}</h3>
                        {!isMinimized && (
                          <p className="text-[10px] text-muted-foreground">Ask anything about your studies</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {!isMinimized && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/5" onClick={() => setShowChatList(!showChatList)} title="Chat history">
                        <ChevronLeft className={cn("w-4 h-4 transition-transform duration-200", showChatList && "rotate-180")} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/5" onClick={() => newChat()} title="New chat">
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/5 relative" onClick={() => setShowTextbooks(true)} title="Textbooks">
                        <Library className="w-4 h-4" />
                        {textbookCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center text-[7px] text-primary-foreground font-bold">
                            {textbookCount}
                          </span>
                        )}
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/5" onClick={() => { if (isMinimized) setIsMinimized(false); else setIsMinimized(true); }} title={isMinimized ? "Expand" : "Minimize"}>
                    <Minimize2 className={cn("w-4 h-4 transition-transform duration-200", isMinimized && "rotate-180")} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/5" onClick={handleClose} title="Close">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </StaggerContent>

            {!isMinimized && (
              <>
                {showChatList ? (
                  <StaggerContent delay={0.18}>
                    <ScrollArea className="flex-1 p-2">
                      <motion.div className="space-y-1" variants={staggerContainer} initial="initial" animate="animate">
                        {chats.map(chat => (
                          <motion.div
                            key={chat.id}
                            variants={staggerItem}
                            className={cn(
                              "flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors group",
                              chat.id === activeChatId ? "bg-primary/10 border border-primary/20" : "hover:bg-white/5"
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
                          </motion.div>
                        ))}
                      </motion.div>
                    </ScrollArea>
                  </StaggerContent>
                ) : (
                  <>
                    <StaggerContent delay={0.18}>
                      <ScrollArea
                        ref={scrollRef}
                        className="flex-1 p-3 w-full overflow-x-hidden [&_[data-radix-scroll-area-viewport]]:overflow-x-hidden"
                      >
                        {messages.length === 0 ? (
                          <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full flex flex-col items-center justify-center text-center p-2"
                          >
                            <motion.div
                              className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3"
                              animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
                              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            >
                              <Sparkles className="w-6 h-6 text-primary" />
                            </motion.div>
                            <h4 className="text-sm font-semibold mb-1">How can I help you today?</h4>
                            <p className="text-xs text-muted-foreground mb-4">
                              Ask questions, get study tips, or attach documents
                            </p>
                            <motion.div
                              className="grid grid-cols-2 gap-2 w-full"
                              variants={staggerContainer}
                              initial="initial"
                              animate="animate"
                            >
                              {QUICK_PROMPTS.map((item, i) => (
                                <motion.button
                                  key={i}
                                  variants={staggerItem}
                                  whileHover={{ scale: 1.03, borderColor: "hsla(38, 92%, 50%, 0.4)" }}
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => handleQuickPrompt(item.prompt)}
                                  disabled={isLoading}
                                  className={cn(
                                    "flex items-center gap-1.5 p-2 rounded-lg",
                                    "border border-white/10 bg-white/[0.03]",
                                    "text-left text-xs transition-colors",
                                    "hover:bg-primary/[0.06]",
                                    "disabled:opacity-50 disabled:cursor-not-allowed"
                                  )}
                                >
                                  <item.icon className="w-3 h-3 text-primary shrink-0" />
                                  <span className="line-clamp-1">{item.text}</span>
                                </motion.button>
                              ))}
                            </motion.div>
                          </motion.div>
                        ) : (
                          <motion.div
                            className="space-y-3 w-full"
                            initial="initial"
                            animate="animate"
                          >
                            <AnimatePresence mode="wait">
                              {messages.map((msg, i) => (
                                <motion.div
                                  key={msg.id || `msg-${i}`}
                                  layout
                                  variants={messageVariants}
                                  initial="initial"
                                  animate="animate"
                                  transition={springMessage}
                                  className={cn(
                                    "flex gap-2 w-full",
                                    msg.role === 'user' ? "justify-end" : "justify-start"
                                  )}
                                >
                                  {msg.role === 'assistant' && (
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-primary/20 mt-1">
                                      <Bot className="w-3 h-3 text-primary" />
                                    </div>
                                  )}
                                  <div
                                    className={cn(
                                      "rounded-xl px-3 py-2 min-w-0 relative group",
                                      "max-w-[85%]",
                                      msg.role === 'assistant'
                                        ? "bg-white/[0.06] border border-white/5 text-foreground"
                                        : "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-sm shadow-primary/20"
                                    )}
                                    style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                                  >
                                    {msg.attachment && (
                                      <div className="flex items-center gap-1 mb-1 text-[10px] opacity-75">
                                        {msg.attachment?.mimeType?.startsWith('image/') ? <Image className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
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
                                      <motion.div
                                        initial={{ opacity: 0 }}
                                        whileInView={{ opacity: 1 }}
                                        className={cn(
                                          "absolute -top-2 right-1 flex items-center gap-0.5",
                                          "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                                          "bg-background/80 backdrop-blur-md rounded-md px-1 py-0.5 shadow-sm border border-white/10"
                                        )}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => copyMessage(msg.content!)}
                                          className="p-0.5 rounded hover:bg-white/10 transition-colors"
                                          title="Copy message"
                                        >
                                          <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                                        </button>
                                        {msg.role === 'user' && (
                                          <button
                                            type="button"
                                            onClick={() => editMessage(i, msg.content!)}
                                            className="p-0.5 rounded hover:bg-white/10 transition-colors"
                                            title="Edit message"
                                          >
                                            <Pencil className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                                          </button>
                                        )}
                                      </motion.div>
                                    )}
                                  </div>
                                  {msg.role === 'user' && (
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-primary/20 mt-1">
                                      <span className="text-[10px] font-medium text-primary">You</span>
                                    </div>
                                  )}
                                </motion.div>
                              ))}
                            </AnimatePresence>
                            {showTyping && (
                              <div className="flex gap-2 justify-start">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-primary/20">
                                  <Bot className="w-3 h-3 text-primary" />
                                </div>
                                <div className="bg-white/[0.06] border border-white/5 rounded-xl px-3 py-2.5">
                                  <TypingDots />
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                        <AnimatePresence>
                          {!isAtBottom && messages.length > 5 && (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.8, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.8, y: 10 }}
                              transition={{ type: "spring", stiffness: 300, damping: 25 }}
                              onClick={scrollToBottom}
                              className="sticky bottom-2 left-1/2 -translate-x-1/2 z-10 w-8 h-8 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 transition-colors"
                            >
                              <ChevronDown className="w-4 h-4 text-primary-foreground" />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </ScrollArea>
                    </StaggerContent>

                    {attachment && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-3 py-1.5 border-t border-white/5 bg-white/[0.02] flex items-center gap-2"
                      >
                        {attachment.preview ? (
                          <img src={attachment.preview} alt="" className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                        )}
                        <span className="text-xs truncate flex-1">{attachment.name}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 hover:bg-white/10" onClick={clearAttachment}>
                          <X className="w-3 h-3" />
                        </Button>
                      </motion.div>
                    )}

                    <StaggerContent delay={0.25}>
                      <form onSubmit={handleSubmit} className="p-3 border-t border-white/5 bg-background/30 shrink-0">
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
                          <div className="relative flex-1 min-w-0">
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
                              className="min-h-[40px] max-h-[80px] resize-none text-sm flex-1 min-w-0 bg-white/5 border-white/10 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                              rows={1}
                              disabled={isLoading}
                            />
                          </div>
                          <motion.button
                            type="submit"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={(!input.trim() && !attachment) || isLoading}
                            className={cn(
                              "shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
                              "bg-primary text-primary-foreground shadow-sm shadow-primary/30",
                              "hover:bg-primary/90 transition-colors",
                              "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                          >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </motion.button>
                        </div>
                      </form>
                    </StaggerContent>
                  </>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {showTextbooks && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowTextbooks(false)}>
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <TextbookUploader onClose={() => setShowTextbooks(false)} />
          </motion.div>
        </div>
      )}
    </>
  );
};

function StaggerContent({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(4px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.35, delay, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}

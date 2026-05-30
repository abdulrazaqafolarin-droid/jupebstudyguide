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
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const clickPrevented = useRef(false);
  const physicsRef = useRef({ vx: 0, vy: 0, animFrame: 0, lastTime: 0 });
  const dragHistoryRef = useRef<Array<{ x: number; y: number; time: number }>>([]);
  const phaseRef = useRef<'idle' | 'drag' | 'fling'>('idle');
  const settlingRef = useRef(false);

  const BTN_SIZE = 56;
  const BOUNCE_DAMPING = 0.6;
  const FRICTION = 0.97;
  const VELOCITY_THRESHOLD = 0.4;
  const DRAG_HISTORY_LEN = 5;
  const SPRING_STIFFNESS = 0.006;
  const SETTLE_DIST = 5;
  const SETTLE_VEL = 0.5;

  const [fabPos, setFabPosRaw] = useState(() => {
    try {
      const raw = localStorage.getItem('jupeb-ai-fab-pos');
      if (raw) return JSON.parse(raw);
    } catch {}
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    return { x: vw - 80, y: vh - 80 };
  });
  const setFabPos = useCallback((pos: { x: number; y: number }) => {
    setFabPosRaw(pos);
    try { localStorage.setItem('jupeb-ai-fab-pos', JSON.stringify(pos)); } catch {}
  }, []);
  const renderPos = useRef(fabPos);
  const [isDragging, setIsDragging] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [settleWobble, setSettleWobble] = useState(0);

  const { attachment, isProcessing, addAttachment, clearAttachment } = useAttachment();

  useEffect(() => {
    const target = findNearestCorner(fabPos.x, fabPos.y, BTN_SIZE);
    if (target.x !== fabPos.x || target.y !== fabPos.y) {
      renderPos.current = target;
      setFabPos(target);
      if (fabRef.current) {
        fabRef.current.style.left = `${target.x}px`;
        fabRef.current.style.top = `${target.y}px`;
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    const gap = 10;
    const pw = 400;
    const ph = Math.min(540, window.innerHeight - 100);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 16;
    const docked = fabPos.x < vw / 2 ? 'left' : 'right';
    let top: number;
    const spaceAbove = fabPos.y - pad;
    const spaceBelow = vh - (fabPos.y + BTN_SIZE) - pad;
    if (spaceAbove >= ph) {
      top = fabPos.y - ph - gap;
    } else if (spaceBelow >= ph) {
      top = fabPos.y + BTN_SIZE + gap;
    } else {
      top = clamp((vh - ph) / 2, pad, vh - ph - pad);
    }
    let left: number;
    if (docked === 'left') {
      left = fabPos.x + BTN_SIZE + gap;
    } else {
      left = fabPos.x - pw - gap;
    }
    left = clamp(left, pad, vw - pw - pad);
    return { top: clamp(top, pad, vh - ph - pad), left: clamp(left, pad, vw - pw - pad), width: pw };
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

  useEffect(() => { renderPos.current = fabPos; }, [fabPos]);

  const bouncePhysics = useCallback(() => {
    if (!fabRef.current || phaseRef.current !== 'fling') return;

    const el = fabRef.current;
    const now = performance.now();
    const dt = Math.min((now - physicsRef.current.lastTime) / 16.67, 3);
    physicsRef.current.lastTime = now;

    let vx = physicsRef.current.vx;
    let vy = physicsRef.current.vy;

    vx *= FRICTION;
    vy *= FRICTION;

    const target = findNearestCorner(renderPos.current.x, renderPos.current.y, BTN_SIZE);
    const dx = target.x - renderPos.current.x;
    const dy = target.y - renderPos.current.y;
    vx += dx * SPRING_STIFFNESS;
    vy += dy * SPRING_STIFFNESS;

    let nx = renderPos.current.x + vx * dt;
    let ny = renderPos.current.y + vy * dt;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (nx < 0) { nx = 0; vx = -vx * BOUNCE_DAMPING; }
    else if (nx + BTN_SIZE > vw) { nx = vw - BTN_SIZE; vx = -vx * BOUNCE_DAMPING; }
    if (ny < 0) { ny = 0; vy = -vy * BOUNCE_DAMPING; }
    else if (ny + BTN_SIZE > vh) { ny = vh - BTN_SIZE; vy = -vy * BOUNCE_DAMPING; }

    renderPos.current = { x: nx, y: ny };
    el.style.left = `${nx}px`;
    el.style.top = `${ny}px`;
    physicsRef.current.vx = vx;
    physicsRef.current.vy = vy;

    const distToTarget = Math.abs(target.x - nx) + Math.abs(target.y - ny);
    const speed = Math.abs(vx) + Math.abs(vy);

    if (distToTarget < SETTLE_DIST && speed < SETTLE_VEL) {
      renderPos.current = { x: target.x, y: target.y };
      el.style.left = `${target.x}px`;
      el.style.top = `${target.y}px`;
      physicsRef.current.vx = 0;
      physicsRef.current.vy = 0;
      physicsRef.current.animFrame = 0;
      phaseRef.current = 'idle';
      settlingRef.current = false;
      setIsSettling(false);
      setFabPos({ x: target.x, y: target.y });
      setSettleWobble(k => k + 1);
      return;
    }

    physicsRef.current.animFrame = requestAnimationFrame(bouncePhysics);
  }, [setFabPos]);

  const handleFabPointerDown = useCallback((e: React.PointerEvent) => {
    if (settlingRef.current) {
      clickPrevented.current = true;
      return;
    }
    clickPrevented.current = false;
    if (physicsRef.current.animFrame) {
      cancelAnimationFrame(physicsRef.current.animFrame);
      physicsRef.current.animFrame = 0;
    }
    phaseRef.current = 'drag';
    physicsRef.current.vx = 0;
    physicsRef.current.vy = 0;
    dragHistoryRef.current = [{ x: e.clientX, y: e.clientY, time: performance.now() }];
    const el = fabRef.current;
    if (el) {
      el.style.transition = 'none';
      el.style.left = `${renderPos.current.x}px`;
      el.style.top = `${renderPos.current.y}px`;
    }
    dragRef.current = {
      isDragging: false,
      startX: e.clientX,
      startY: e.clientY,
      originX: renderPos.current.x,
      originY: renderPos.current.y,
    };
    fabRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const handleFabPointerMove = useCallback((e: React.PointerEvent) => {
    if (phaseRef.current !== 'drag') return;
    const el = fabRef.current;
    if (!el) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (!dragRef.current.isDragging && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      dragRef.current.isDragging = true;
      clickPrevented.current = true;
      setIsDragging(true);
    }
    if (dragRef.current.isDragging) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const nx = Math.min(Math.max(dragRef.current.originX + dx, 0), vw - BTN_SIZE);
      const ny = Math.min(Math.max(dragRef.current.originY + dy, 0), vh - BTN_SIZE);
      renderPos.current = { x: nx, y: ny };
      el.style.left = `${nx}px`;
      el.style.top = `${ny}px`;
      const h = dragHistoryRef.current;
      h.push({ x: e.clientX, y: e.clientY, time: performance.now() });
      if (h.length > DRAG_HISTORY_LEN) h.shift();
    }
  }, []);

  const handleFabPointerUp = useCallback((e: React.PointerEvent) => {
    if (phaseRef.current === 'drag' && dragRef.current.isDragging) {
      const h = dragHistoryRef.current;
      if (h.length >= 2) {
        const first = h[0];
        const last = h[h.length - 1];
        const dt = last.time - first.time;
        if (dt > 0) {
          const fps = 16.67;
          let throwVx = (last.x - first.x) / dt * fps;
          let throwVy = (last.y - first.y) / dt * fps;
          const maxV = 25;
          const mag = Math.sqrt(throwVx * throwVx + throwVy * throwVy);
          if (mag > maxV) { throwVx = throwVx / mag * maxV; throwVy = throwVy / mag * maxV; }
          physicsRef.current.vx = throwVx;
          physicsRef.current.vy = throwVy;
        }
      }
      physicsRef.current.lastTime = performance.now();
      setIsDragging(false);
      phaseRef.current = 'fling';
      settlingRef.current = true;
      setIsSettling(true);
      physicsRef.current.animFrame = requestAnimationFrame(bouncePhysics);
    }
    phaseRef.current = 'idle';
    dragRef.current.isDragging = false;
  }, [bouncePhysics]);

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

  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let { x, y } = renderPos.current;
      x = Math.min(Math.max(x, 0), vw - BTN_SIZE);
      y = Math.min(Math.max(y, 0), vh - BTN_SIZE);
      const target = findNearestCorner(x, y, BTN_SIZE);
      if (target.x !== renderPos.current.x || target.y !== renderPos.current.y) {
        renderPos.current = { x: target.x, y: target.y };
        setFabPos({ x: target.x, y: target.y });
        if (fabRef.current) {
          fabRef.current.style.transition = 'none';
          fabRef.current.style.left = `${target.x}px`;
          fabRef.current.style.top = `${target.y}px`;
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (physicsRef.current.animFrame) {
        cancelAnimationFrame(physicsRef.current.animFrame);
        physicsRef.current.animFrame = 0;
      }
    };
  }, [setFabPos]);

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
            ref={fabRef}
            onPointerDown={handleFabPointerDown}
            onPointerMove={handleFabPointerMove}
            onPointerUp={handleFabPointerUp}
            onLostPointerCapture={handleFabPointerUp}
            style={{
              position: 'fixed',
              left: renderPos.current.x,
              top: renderPos.current.y,
              touchAction: 'none',
              pointerEvents: isSettling ? 'none' : 'auto',
            }}
            className={cn(
              "fixed z-50 w-14 h-14 rounded-full",
              "bg-gradient-to-br from-primary to-accent",
              "flex items-center justify-center",
              isDragging
                ? "cursor-grabbing shadow-2xl shadow-primary/50 ring-2 ring-primary/30 scale-110"
                : "cursor-grab shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40",
              isSettling && "shadow-2xl shadow-primary/60"
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

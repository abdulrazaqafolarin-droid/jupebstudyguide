import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent,
  useReducedMotion, type PanInfo,
} from "framer-motion";
import {
  Bot, MessageCircle, Plus, ChevronLeft, X, Minimize2, Library, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudyChat } from "@/hooks/useStudyChat";
import { ThreadView } from "@/components/study-chat/ThreadView";
import { HistorySidebar } from "@/components/study-chat/HistorySidebar";
import { Composer } from "@/components/study-chat/Composer";
import { JAMB_TUTOR_PROMPT, JAMB_TUTOR_STARTERS } from "@/lib/jamb-prompts";

const FAB_SIZE = 56;
const PANEL_WIDTH = 400;
const PANEL_HEIGHT = 540;
const PANEL_GUTTER = 16;
const DRAG_FRICTION = 0.96;
const MOMENTUM_THRESHOLD = 0.8;
const SNAP_SPRING = { type: "spring" as const, stiffness: 220, damping: 22, mass: 0.85 };
const POSITION_KEY = "jamb-ai-fab-pos";

type Point = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getInitialPosition(): Point {
  const fallback = {
    x: typeof window === "undefined" ? 0 : Math.max(0, window.innerWidth - 80),
    y: typeof window === "undefined" ? 0 : Math.max(0, window.innerHeight - 80),
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(POSITION_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Point>;
    if (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return fallback;
    return {
      x: clamp(parsed.x as number, 0, Math.max(0, window.innerWidth - FAB_SIZE)),
      y: clamp(parsed.y as number, 0, Math.max(0, window.innerHeight - FAB_SIZE)),
    };
  } catch {
    return fallback;
  }
}

function findNearestCorner(x: number, y: number): Point {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const centerX = x + FAB_SIZE / 2;
  const centerY = y + FAB_SIZE / 2;
  const corners = [
    { x: 0, y: 0 },
    { x: vw - FAB_SIZE, y: 0 },
    { x: 0, y: vh - FAB_SIZE },
    { x: vw - FAB_SIZE, y: vh - FAB_SIZE },
  ];
  return corners.reduce((best, corner) => {
    const bestDistance = Math.hypot(centerX - (best.x + FAB_SIZE / 2), centerY - (best.y + FAB_SIZE / 2));
    const cornerDistance = Math.hypot(centerX - (corner.x + FAB_SIZE / 2), centerY - (corner.y + FAB_SIZE / 2));
    return cornerDistance < bestDistance ? corner : best;
  }, corners[0]);
}

export function JambFloatingAITutor() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [initialPosition] = useState<Point>(getInitialPosition);
  const [fabPosition, setFabPosition] = useState<Point>(initialPosition);

  const x = useMotionValue(initialPosition.x);
  const y = useMotionValue(initialPosition.y);
  const positionRef = useRef<Point>(initialPosition);
  const momentumFrame = useRef<number>(0);
  const momentumVelocity = useRef({ vx: 0, vy: 0 });
  const settlingRef = useRef(false);
  const animatingRef = useRef(false);
  const [isSettling, setIsSettling] = useState(false);
  const [settleWobble, setSettleWobble] = useState(0);

  const {
    chats, activeChatId, messages, isStreaming, listLoading, streamError,
    activeTopic, switchChat, newChat, renameChat, deleteChat, sendMessage,
    sendEdited, retry, stop,
  } = useStudyChat("jamb", JAMB_TUTOR_PROMPT);

  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? null;

  useMotionValueEvent(x, "change", (value) => { positionRef.current.x = value; });
  useMotionValueEvent(y, "change", (value) => { positionRef.current.y = value; });

  const persistPosition = useCallback((position: Point) => {
    setFabPosition(position);
    try {
      window.localStorage.setItem(POSITION_KEY, JSON.stringify(position));
    } catch {
      // The tutor remains usable when storage is unavailable.
    }
  }, []);

  const snapToCorner = useCallback(() => {
    const unlock = () => {
      settlingRef.current = false;
      setIsSettling(false);
      animatingRef.current = false;
    };

    if (animatingRef.current) {
      unlock();
      return;
    }

    const target = findNearestCorner(positionRef.current.x, positionRef.current.y);
    const dx = Math.abs(positionRef.current.x - target.x);
    const dy = Math.abs(positionRef.current.y - target.y);
    if (dx < 1 && dy < 1) {
      unlock();
      persistPosition(target);
      setSettleWobble((value) => value + 1);
      return;
    }

    settlingRef.current = true;
    animatingRef.current = true;
    setIsSettling(true);
    const safetyTimer = window.setTimeout(unlock, 3000);
    Promise.all([
      animate(x, target.x, shouldReduceMotion ? { duration: 0 } : SNAP_SPRING),
      animate(y, target.y, shouldReduceMotion ? { duration: 0 } : SNAP_SPRING),
    ]).then(() => {
      window.clearTimeout(safetyTimer);
      unlock();
      persistPosition(target);
      if (!shouldReduceMotion) setSettleWobble((value) => value + 1);
    }).catch(unlock);
  }, [persistPosition, shouldReduceMotion, x, y]);

  const runMomentum = useCallback(function runMomentumFrame() {
    if (!momentumFrame.current) return;

    const currentX = x.get();
    const currentY = y.get();
    let vx = momentumVelocity.current.vx * DRAG_FRICTION;
    let vy = momentumVelocity.current.vy * DRAG_FRICTION;
    const maxX = Math.max(0, window.innerWidth - FAB_SIZE);
    const maxY = Math.max(0, window.innerHeight - FAB_SIZE);
    let nextX = currentX + vx;
    let nextY = currentY + vy;

    if (nextX < 0) { nextX = 0; vx = -vx * 0.5; }
    else if (nextX > maxX) { nextX = maxX; vx = -vx * 0.5; }
    if (nextY < 0) { nextY = 0; vy = -vy * 0.5; }
    else if (nextY > maxY) { nextY = maxY; vy = -vy * 0.5; }

    x.set(nextX);
    y.set(nextY);
    momentumVelocity.current = { vx, vy };

    if (Math.hypot(vx, vy) > MOMENTUM_THRESHOLD) {
      momentumFrame.current = window.requestAnimationFrame(runMomentumFrame);
    } else {
      momentumFrame.current = 0;
      snapToCorner();
    }
  }, [snapToCorner, x, y]);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    settlingRef.current = false;
    setIsSettling(false);
    animatingRef.current = false;
    if (momentumFrame.current) {
      window.cancelAnimationFrame(momentumFrame.current);
      momentumFrame.current = 0;
    }

    const speed = Math.hypot(info.velocity.x, info.velocity.y);
    if (!shouldReduceMotion && speed > MOMENTUM_THRESHOLD) {
      momentumVelocity.current = { vx: info.velocity.x / 60, vy: info.velocity.y / 60 };
      settlingRef.current = true;
      setIsSettling(true);
      momentumFrame.current = window.requestAnimationFrame(runMomentum);
    } else {
      snapToCorner();
    }
  }, [runMomentum, shouldReduceMotion, snapToCorner]);

  const handleFabTap = useCallback(() => {
    if (settlingRef.current) return;
    persistPosition({ x: x.get(), y: y.get() });
    setIsOpen(true);
  }, [persistPosition, x, y]);

  useEffect(() => {
    const handleResize = () => {
      if (momentumFrame.current) {
        window.cancelAnimationFrame(momentumFrame.current);
        momentumFrame.current = 0;
      }
      const current = {
        x: clamp(x.get(), 0, Math.max(0, window.innerWidth - FAB_SIZE)),
        y: clamp(y.get(), 0, Math.max(0, window.innerHeight - FAB_SIZE)),
      };
      const target = findNearestCorner(current.x, current.y);
      animate(x, target.x, shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 250, damping: 26, mass: 0.8 });
      animate(y, target.y, shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 250, damping: 26, mass: 0.8 });
      persistPosition(target);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (momentumFrame.current) window.cancelAnimationFrame(momentumFrame.current);
    };
  }, [persistPosition, shouldReduceMotion, x, y]);

  useEffect(() => {
    if (!isOpen || listLoading || activeChatId || chats.length === 0) return;
    void switchChat(chats[0].id);
  }, [isOpen, listLoading, activeChatId, chats, switchChat]);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
    setShowHistory(false);
    setEditingIndex(null);
  }, []);

  const createNewChat = useCallback(async () => {
    setInput("");
    setEditingIndex(null);
    const id = await newChat();
    if (id) setShowHistory(false);
  }, [newChat]);

  const selectChat = useCallback((id: string) => {
    void switchChat(id);
    setShowHistory(false);
    setEditingIndex(null);
    setInput("");
  }, [switchChat]);

  const send = useCallback(async (attachment: { base64: string; mimeType: string; name: string } | null) => {
    const text = input.trim();
    if ((!text && !attachment) || isStreaming) return;
    setInput("");
    if (editingIndex !== null) {
      const index = editingIndex;
      setEditingIndex(null);
      await sendEdited(text, index);
      return;
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

  const panelOrigin = useMemo(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(PANEL_WIDTH, Math.max(240, vw - PANEL_GUTTER * 2));
    const height = Math.min(PANEL_HEIGHT, Math.max(240, vh - PANEL_GUTTER * 2));
    const fabCenterX = fabPosition.x + FAB_SIZE / 2;
    const fabCenterY = fabPosition.y + FAB_SIZE / 2;
    const nearLeft = fabCenterX < vw / 2;
    const nearTop = fabCenterY < vh / 2;
    const left = clamp(nearLeft ? vw - width - PANEL_GUTTER : PANEL_GUTTER, PANEL_GUTTER, Math.max(PANEL_GUTTER, vw - width - PANEL_GUTTER));
    const top = clamp(nearTop ? vh - height - PANEL_GUTTER : PANEL_GUTTER, PANEL_GUTTER, Math.max(PANEL_GUTTER, vh - height - PANEL_GUTTER));
    return { top, left, width, height };
  }, [fabPosition]);

  const origin = useMemo(() => ({
    x: clamp(((fabPosition.x + FAB_SIZE / 2 - panelOrigin.left) / panelOrigin.width) * 100, 0, 100),
    y: clamp(((fabPosition.y + FAB_SIZE / 2 - panelOrigin.top) / panelOrigin.height) * 100, 0, 100),
  }), [fabPosition, panelOrigin]);

  return (
    <>
      <AnimatePresence mode="wait">
        {!isOpen && (
          <motion.button
            key="jamb-fab"
            type="button"
            drag
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={{
              left: 0,
              right: Math.max(0, typeof window !== "undefined" ? window.innerWidth - FAB_SIZE : 1000),
              top: 0,
              bottom: Math.max(0, typeof window !== "undefined" ? window.innerHeight - FAB_SIZE : 1000),
            }}
            onDragEnd={handleDragEnd}
            onTap={handleFabTap}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              rotate: settleWobble > 0 && !shouldReduceMotion ? [0, -8, 5, -3, 1, 0] : 0,
            }}
            exit={{ scale: 0.85, opacity: 0, transition: { duration: shouldReduceMotion ? 0 : 0.15 } }}
            whileTap={{ scale: 0.94 }}
            whileDrag={{ scale: 1.04 }}
            transition={{
              scale: shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 20 },
              opacity: { duration: shouldReduceMotion ? 0 : 0.2 },
              rotate: settleWobble > 0 && !shouldReduceMotion ? { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0 },
            }}
            onAnimationComplete={() => { if (settleWobble > 0) setSettleWobble(0); }}
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              x,
              y,
              zIndex: 50,
              touchAction: "none",
              willChange: "transform",
            }}
            className={[
              "flex h-14 w-14 items-center justify-center rounded-full",
              "bg-gradient-to-br from-primary to-accent text-primary-foreground",
              isSettling ? "shadow-2xl shadow-primary/60" : "shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40",
              "cursor-grab active:cursor-grabbing",
            ].join(" ")}
            aria-label="Open JAMB AI tutor"
            title="Open JAMB AI tutor"
          >
            <motion.span
              className="absolute inset-0 rounded-full"
              animate={shouldReduceMotion ? { opacity: 0.45 } : {
                boxShadow: isSettling
                  ? ["0 0 0 0 hsla(38, 92%, 50%, 0.5)", "0 0 0 20px hsla(38, 92%, 50%, 0)"]
                  : ["0 0 0 0 hsla(38, 92%, 50%, 0.3)", "0 0 0 16px hsla(38, 92%, 50%, 0)"],
              }}
              transition={{ duration: isSettling ? 0.5 : 2.2, repeat: shouldReduceMotion ? 0 : Infinity, ease: "easeOut" }}
            />
            <MessageCircle className="relative z-10 h-6 w-6" />
            <motion.span
              className="absolute -right-0.5 -top-0.5 z-10 h-3.5 w-3.5 rounded-full border-2 border-background bg-green-500"
              animate={shouldReduceMotion ? { opacity: 1 } : { scale: [1, 1.2, 1], opacity: [1, 0.85, 1] }}
              transition={{ duration: 2.5, repeat: shouldReduceMotion ? 0 : Infinity, ease: "easeInOut" }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.section
            key="jamb-tutor-panel"
            role="dialog"
            aria-label="JAMB AI tutor"
            aria-modal={false}
            initial={{ opacity: 0, scale: 0.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.06 }}
            transition={{
              scale: shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 350, damping: 30, mass: 0.9 },
              opacity: { duration: shouldReduceMotion ? 0 : 0.2 },
            }}
            style={{
              position: "fixed",
              top: panelOrigin.top,
              left: panelOrigin.left,
              width: panelOrigin.width,
              height: isMinimized ? "auto" : panelOrigin.height,
              transformOrigin: `${origin.x}% ${origin.y}%`,
              zIndex: 70,
            }}
            className={[
              "flex max-w-[calc(100vw-2rem)] flex-col overflow-hidden",
              "rounded-2xl border border-white/10 bg-card/90 backdrop-blur-xl",
              "shadow-2xl shadow-black/30",
              isMinimized ? "h-auto" : "max-h-[calc(100dvh-2rem)]",
            ].join(" ")}
          >
            <div
              className={[
                "flex shrink-0 items-center justify-between gap-2 border-b border-white/5 p-3",
                "bg-gradient-to-r from-primary/[0.08] via-accent/[0.06] to-transparent",
                isMinimized ? "cursor-pointer" : "",
              ].join(" ")}
              onClick={() => { if (isMinimized) setIsMinimized(false); }}
            >
              <div className="flex min-w-0 items-center gap-2">
                {showHistory && !isMinimized ? (
                  <h3 className="truncate text-sm font-semibold text-foreground">Chat History</h3>
                ) : (
                  <>
                    <motion.div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20"
                      whileHover={shouldReduceMotion ? undefined : { rotate: 15 }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    >
                      <Bot className="h-4 w-4 text-primary" />
                    </motion.div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-foreground">{activeChat?.title || "AI Tutor"}</h3>
                      {!isMinimized && <p className="text-[10px] text-muted-foreground">Ask anything about your studies</p>}
                    </div>
                  </>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1" onClick={(event) => event.stopPropagation()}>
                {!isMinimized && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-white/5"
                      aria-label="Chat history"
                      title="Chat history"
                      onClick={() => setShowHistory((value) => !value)}
                    >
                      <ChevronLeft className={["h-4 w-4 transition-transform duration-200", showHistory ? "rotate-180" : ""].join(" ")} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-white/5"
                      aria-label="New chat"
                      title="New chat"
                      onClick={() => { void createNewChat(); }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="relative h-7 w-7 hover:bg-white/5"
                      aria-label="Textbooks"
                      title="Textbooks"
                      onClick={() => { close(); navigate("/jamb/ai?textbooks=1"); }}
                    >
                      <Library className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-white/5"
                  aria-label={isMinimized ? "Expand tutor" : "Minimize tutor"}
                  title={isMinimized ? "Expand" : "Minimize"}
                  onClick={() => setIsMinimized((value) => !value)}
                >
                  <Minimize2 className={["h-4 w-4 transition-transform duration-200", isMinimized ? "rotate-180" : ""].join(" ")} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-white/5"
                  aria-label="Close tutor"
                  title="Close"
                  onClick={close}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <div className="flex min-h-0 flex-1 flex-col">
                {showHistory ? (
                  <div className="min-h-0 flex-1">
                    <HistorySidebar
                      chats={chats}
                      activeChatId={activeChatId}
                      loading={listLoading}
                      onSelect={selectChat}
                      onNewChat={() => { void createNewChat(); }}
                      onRename={(chatId, title) => { void renameChat(chatId, title); }}
                      onDelete={(chatId) => { void deleteChat(chatId); }}
                      onClose={() => setShowHistory(false)}
                      heading="JAMB chat history"
                      emptyMessage="Your JAMB chats will appear here."
                      showNewChatButton={false}
                    />
                  </div>
                ) : listLoading ? (
                  <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <main className="min-h-0 flex-1 overflow-y-auto p-3">
                      <ThreadView
                        messages={activeChatId ? messages : []}
                        isStreaming={isStreaming}
                        streamError={streamError}
                        editingIndex={editingIndex}
                        activeTopic={activeTopic}
                        onEdit={(index, text) => { setEditingIndex(index); setInput(text); }}
                        onRetry={() => { void retry(); }}
                        onStarter={(prompt) => { void sendStarter(prompt); }}
                        starterPrompts={JAMB_TUTOR_STARTERS}
                        emptyTitle="How can I help you today?"
                        emptyDescription="Ask questions, get study tips, or attach documents."
                        compact
                      />
                    </main>
                    <Composer
                      value={input}
                      onChange={setInput}
                      onSend={(attachment) => { void send(attachment); }}
                      onStop={stop}
                      isStreaming={isStreaming}
                      placeholder="Ask me anything…"
                      editing={editingIndex !== null}
                      onCancelEdit={() => { setEditingIndex(null); setInput(""); }}
                      compact
                    />
                  </>
                )}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

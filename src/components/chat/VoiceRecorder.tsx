import { useRef, useState, useCallback, useEffect } from 'react';
import { Mic, Send, Trash2, Lock, ChevronLeft, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface VoiceRecorderProps {
  waveform: number[];
  duration: number;
  isLocked: boolean;
  isSending: boolean;
  onSend: () => void;
  onCancel: () => void;
  onLock: () => void;
  onStart?: () => void;
}

const CANCEL_THRESHOLD = 80;
const LOCK_THRESHOLD = -70;

export function VoiceRecorder({
  waveform,
  duration,
  isLocked,
  isSending,
  onSend,
  onCancel,
  onLock,
}: VoiceRecorderProps) {
  const micRef = useRef<HTMLButtonElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const [swipeX, setSwipeX] = useState(0);
  const [swipeY, setSwipeY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isLocked && !isSending) {
      setSwipeX(0);
      setSwipeY(0);
      setIsDragging(false);
    }
  }, [isLocked, isSending]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    setIsDragging(true);
    setSwipeX(0);
    setSwipeY(0);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;
    setSwipeX(dx);
    setSwipeY(dy);
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const x = swipeX;
    const y = swipeY;

    if (x < -CANCEL_THRESHOLD) {
      onCancel();
    } else if (y < LOCK_THRESHOLD) {
      onLock();
    } else {
      onSend();
    }

    setSwipeX(0);
    setSwipeY(0);
  }, [isDragging, swipeX, swipeY, onCancel, onLock, onSend]);

  const isCancelling = swipeX < -CANCEL_THRESHOLD * 0.6;
  const isLocking = swipeY < LOCK_THRESHOLD * 0.6;
  const showTrashZone = swipeX < -20;
  const showLockZone = swipeY < -20;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="overflow-hidden"
    >
      <div className="px-3 py-2 select-none" style={{ touchAction: 'none' }}>
        {isSending ? (
          <div className="flex items-center gap-3 h-14">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              >
                <Send className="w-4 h-4" />
              </motion.div>
              <span className="text-sm">Sending voice note...</span>
            </div>
          </div>
        ) : isLocked ? (
          <div className="flex items-center gap-3 h-14 bg-card/50 rounded-lg px-3 shadow-sm border border-border/50">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="shrink-0"
            >
              <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
                <Lock className="w-3.5 h-3.5 text-accent" />
              </div>
            </motion.div>
            <motion.div
              className="flex-1 flex items-center justify-center gap-[2px] h-8"
              initial="init"
              animate="in"
              variants={{ init: {}, in: { transition: { staggerChildren: 0.012 } } }}
            >
              {waveform.map((h, i) => (
                <motion.div
                  key={i}
                  custom={i}
                  variants={{
                    init: { height: 0, opacity: 0 },
                    in: {
                      height: `${Math.max(3, h)}px`,
                      opacity: 1,
                      transition: { type: 'spring', stiffness: 120, damping: 10, mass: 0.6 },
                    },
                  }}
                  className={cn(
                    'w-[3px] rounded-full',
                    i % 2 === 0 ? 'bg-primary' : 'bg-primary/50'
                  )}
                />
              ))}
            </motion.div>
            <span className="text-sm font-mono text-primary font-medium tabular-nums min-w-[40px] text-right">
              {formatTime(duration)}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="icon"
                variant="ghost"
                onClick={onCancel}
                className="shrink-0 rounded-full h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                onClick={onSend}
                className="shrink-0 rounded-full h-9 w-9 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg shadow-primary/20"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 h-14 px-2 rounded-lg bg-card/20">
            <div className="relative min-w-[90px]">
              <motion.div
                className="flex items-center gap-1"
                animate={{
                  x: showTrashZone ? -4 : 0,
                  opacity: showTrashZone ? 1 : 0.5,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <ChevronLeft
                  className={cn(
                    'w-3.5 h-3.5 transition-colors',
                    isCancelling ? 'text-destructive' : 'text-muted-foreground'
                  )}
                />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={isCancelling ? 'cancel' : 'slide'}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className={cn(
                      'text-[10px] whitespace-nowrap',
                      isCancelling
                        ? 'text-destructive font-semibold'
                        : 'text-muted-foreground/60'
                    )}
                  >
                    {isCancelling ? 'Release to cancel' : 'Slide to cancel'}
                  </motion.span>
                </AnimatePresence>
              </motion.div>
              <motion.div
                className="flex items-center gap-1 mt-0.5"
                animate={{
                  x: showLockZone ? 0 : -4,
                  opacity: showLockZone ? 1 : 0.3,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <ArrowUp className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] whitespace-nowrap text-muted-foreground/40">
                  Slide up to lock
                </span>
              </motion.div>
            </div>

            <motion.div
              className="flex-1 flex items-center justify-center gap-[2px] h-10"
              initial="init"
              animate="in"
              variants={{ init: {}, in: { transition: { staggerChildren: 0.012 } } }}
            >
              {waveform.map((h, i) => (
                <motion.div
                  key={i}
                  custom={i}
                  variants={{
                    init: { height: 0, opacity: 0 },
                    in: {
                      height: `${Math.max(3, h)}px`,
                      opacity: 1,
                      transition: { type: 'spring', stiffness: 120, damping: 10, mass: 0.6 },
                    },
                  }}
                  className={cn(
                    'w-[3px] rounded-full',
                    i % 2 === 0 ? 'bg-primary' : 'bg-primary/50'
                  )}
                />
              ))}
            </motion.div>

            <span className="text-sm font-mono text-primary font-medium tabular-nums min-w-[40px] text-right">
              {formatTime(duration)}
            </span>

            <div className="relative">
              <AnimatePresence>
                {showLockZone && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute -top-14 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none"
                  >
                    <motion.div
                      className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center shadow-lg shadow-accent/10"
                      animate={isLocking ? { scale: [1, 1.15, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                    >
                      <Lock className="w-3.5 h-3.5 text-accent" />
                    </motion.div>
                    <span className="text-[9px] text-accent font-semibold whitespace-nowrap tracking-wider uppercase">
                      Lock
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                ref={micRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer select-none z-10 shadow-lg"
                style={{ touchAction: 'none' }}
                animate={{
                  scale: 1 + (Math.abs(swipeX) / CANCEL_THRESHOLD) * 0.15,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <motion.div
                  className={cn(
                    'absolute inset-0 rounded-full',
                    isCancelling ? 'bg-destructive' : 'bg-gradient-to-r from-primary to-primary/80'
                  )}
                  animate={
                    !isDragging
                      ? { scale: [1, 1.08, 1] }
                      : { scale: 1 }
                  }
                  transition={
                    !isDragging
                      ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' }
                      : { type: 'spring', stiffness: 300, damping: 15 }
                  }
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/20"
                  animate={!isDragging ? {
                    scale: [1, 1.6, 1],
                    opacity: [0.3, 0, 0.3],
                  } : {
                    scale: 1,
                    opacity: 0,
                  }}
                  transition={{
                    repeat: !isDragging ? Infinity : 0,
                    duration: 1.5,
                    ease: 'easeInOut',
                  }}
                />
                <Mic className="w-4 h-4 text-primary-foreground relative z-10" />
              </motion.button>

              <AnimatePresence>
                {isCancelling && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="absolute -bottom-8 left-1/2 -translate-x-1/2"
                  >
                    <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

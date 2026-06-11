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
const LOCK_THRESHOLD = -60;

const spring = { type: 'spring' as const, stiffness: 400, damping: 28 };

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
    setSwipeX(Math.max(0, dx));
    setSwipeY(dy);
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    if (swipeX > CANCEL_THRESHOLD) {
      onCancel();
    } else if (swipeY < LOCK_THRESHOLD) {
      onLock();
    } else {
      onLock();
    }

    setSwipeX(0);
    setSwipeY(0);
  }, [isDragging, swipeX, swipeY, onCancel, onLock]);

  const isCancelling = swipeX > CANCEL_THRESHOLD * 0.6;
  const isLocking = swipeY < LOCK_THRESHOLD * 0.6;
  const showTrashZone = swipeX > 30;
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
      transition={spring}
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
          <div className="flex items-center gap-3 h-14">
            <div className="flex-1 flex items-center justify-center gap-[2px] h-10">
              {waveform.map((h, i) => {
                const even = i % 2 === 0;
                return (
                  <motion.div
                    key={i}
                    className={cn(
                      'w-[3px] rounded-full',
                      even ? 'bg-red-400' : 'bg-red-400/60'
                    )}
                    animate={{ height: `${Math.max(3, h)}px` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                  />
                );
              })}
            </div>
            <span className="text-sm font-mono text-red-500 font-medium tabular-nums min-w-[40px] text-right">
              {formatTime(duration)}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={onCancel}
              className="shrink-0 rounded-full h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              onClick={onSend}
              className="shrink-0 rounded-full h-10 w-10 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 h-14">
            <div className="relative min-w-[90px]">
              <motion.div
                className="flex items-center gap-1"
                animate={{
                  x: showTrashZone ? 0 : -6,
                  opacity: showTrashZone ? 1 : 0.5,
                }}
              >
                <ChevronLeft
                  className={cn(
                    'w-3.5 h-3.5 transition-colors',
                    isCancelling ? 'text-destructive' : 'text-muted-foreground'
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] whitespace-nowrap transition-colors',
                    isCancelling
                      ? 'text-destructive font-semibold'
                      : 'text-muted-foreground/60'
                  )}
                >
                  {isCancelling ? 'Release to cancel' : 'Slide to cancel'}
                </span>
              </motion.div>
              <motion.div
                className="flex items-center gap-1 mt-0.5"
                animate={{
                  x: showLockZone ? 0 : -6,
                  opacity: showLockZone ? 1 : 0.3,
                }}
              >
                <ArrowUp className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] whitespace-nowrap text-muted-foreground/40">
                  Slide up to lock
                </span>
              </motion.div>
            </div>

            <div className="flex-1 flex items-center justify-center gap-[2px] h-10">
              {waveform.map((h, i) => {
                const even = i % 2 === 0;
                return (
                  <motion.div
                    key={i}
                    className={cn(
                      'w-[3px] rounded-full',
                      even ? 'bg-red-400' : 'bg-red-400/60'
                    )}
                    animate={{ height: `${Math.max(3, h)}px` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                  />
                );
              })}
            </div>

            <span className="text-sm font-mono text-red-500 font-medium tabular-nums min-w-[40px] text-right">
              {formatTime(duration)}
            </span>

            <div className="relative">
              <AnimatePresence>
                {showLockZone && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5"
                  >
                    <Lock className="w-3.5 h-3.5 text-accent" />
                    <span className="text-[9px] text-accent font-semibold whitespace-nowrap">
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
                className="relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer select-none z-10"
                style={{ touchAction: 'none' }}
                animate={{
                  scale: 1 + (swipeX / CANCEL_THRESHOLD) * 0.15,
                }}
              >
                <motion.div
                  className={cn(
                    'absolute inset-0 rounded-full transition-colors',
                    isCancelling ? 'bg-destructive' : 'bg-red-500'
                  )}
                  animate={{
                    scale: isCancelling ? 1.15 : [1, 1.08, 1],
                  }}
                  transition={
                    isCancelling
                      ? { type: 'spring', stiffness: 300, damping: 15 }
                      : { repeat: Infinity, duration: 1.2, ease: 'easeInOut' }
                  }
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-red-500/30"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 0, 0.3],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: 'easeInOut',
                  }}
                />
                <Mic className="w-4 h-4 text-white relative z-10" />
              </motion.button>

              <AnimatePresence>
                {isCancelling && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="absolute -bottom-7 left-1/2 -translate-x-1/2"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
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

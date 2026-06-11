import { useRef, useEffect, useCallback, useState } from 'react';
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
}

const SWIPE_CANCEL_THRESHOLD = 80;
const SWIPE_LOCK_THRESHOLD = -60;

export function VoiceRecorder({
  waveform,
  duration,
  isLocked,
  isSending,
  onSend,
  onCancel,
  onLock,
}: VoiceRecorderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startXRef = useRef<number>(0);
  const [swipeX, setSwipeX] = useState(0);
  const [swipeY, setSwipeY] = useState(0);
  const [showCancelHint, setShowCancelHint] = useState(false);
  const [showLockHint, setShowLockHint] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isLocked && !isSending) {
      setSwipeX(0);
      setSwipeY(0);
      setShowCancelHint(false);
      setShowLockHint(false);
    }
  }, [isLocked, isSending]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isLocked || isSending) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isLocked, isSending]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || isLocked || isSending) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    setSwipeX(Math.max(0, dx));
    setSwipeY(dy);
    setShowCancelHint(dx > 30);
    setShowLockHint(dy < -30);
  }, [isDragging, isLocked, isSending]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging || isLocked || isSending) return;
    setIsDragging(false);

    if (swipeX > SWIPE_CANCEL_THRESHOLD) {
      onCancel();
    } else if (swipeY < SWIPE_LOCK_THRESHOLD) {
      onLock();
    }

    setSwipeX(0);
    setSwipeY(0);
    setShowCancelHint(false);
    setShowLockHint(false);
  }, [isDragging, isLocked, isSending, swipeX, swipeY, onCancel, onLock]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const cancelProgress = Math.min(1, swipeX / SWIPE_CANCEL_THRESHOLD);
  const lockProgress = Math.min(1, Math.abs(swipeY) / Math.abs(SWIPE_LOCK_THRESHOLD));

  return (
    <motion.div
      ref={containerRef}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="overflow-hidden"
    >
      <div className="px-3 py-2 select-none touch-none" style={{ touchAction: 'none' }}>
        {isSending ? (
          <div className="flex items-center gap-3 h-12">
            <div className="flex items-center gap-2 text-muted-foreground">
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
          <div className="flex items-center gap-3 h-12">
            <div className="flex items-center gap-2 text-muted-foreground/60">
              <Lock className="w-3.5 h-3.5" />
              <span className="text-[11px]">Tap send to deliver</span>
            </div>
            <div className="flex-1 flex items-center justify-center gap-1">
              {waveform.map((h, i) => (
                <motion.div
                  key={i}
                  className="w-[3px] rounded-full bg-red-400"
                  animate={{ height: `${Math.max(3, h)}px` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                />
              ))}
            </div>
            <span className="text-sm font-mono text-red-500 font-medium tabular-nums min-w-[40px] text-right">
              {formatTime(duration)}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={onCancel}
              className="shrink-0 rounded-full h-8 w-8 text-muted-foreground hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              onClick={onSend}
              className="shrink-0 rounded-full h-9 w-9"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 h-12">
            <div className="flex flex-col items-start min-w-[80px]">
              <motion.div
                className="flex items-center gap-1"
                animate={{
                  x: showCancelHint ? 0 : -8,
                  opacity: showCancelHint ? 1 : 0.5,
                }}
              >
                <ChevronLeft
                  className={cn(
                    'w-3.5 h-3.5 transition-colors',
                    cancelProgress > 0.6 ? 'text-destructive' : 'text-muted-foreground'
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] transition-colors',
                    cancelProgress > 0.6
                      ? 'text-destructive font-medium'
                      : 'text-muted-foreground/70'
                  )}
                >
                  Slide to cancel
                </span>
              </motion.div>
              <motion.div
                className="flex items-center gap-1 mt-0.5"
                animate={{
                  x: showLockHint ? 0 : -8,
                  opacity: showLockHint ? 1 : 0.3,
                }}
              >
                <ArrowUp className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground/50">
                  Slide up to lock
                </span>
              </motion.div>
            </div>

            <div className="flex-1 flex items-center justify-center gap-[2px]">
              {waveform.map((h, i) => (
                <motion.div
                  key={i}
                  className="w-[3px] rounded-full bg-red-400"
                  animate={{ height: `${Math.max(3, h)}px` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                />
              ))}
            </div>

            <span className="text-sm font-mono text-red-500 font-medium tabular-nums min-w-[40px] text-right">
              {formatTime(duration)}
            </span>

            <div className="relative">
              <motion.div
                className={cn(
                  'absolute inset-0 rounded-full',
                  cancelProgress > 0.6 ? 'bg-destructive/20' : 'bg-transparent'
                )}
                animate={{ scale: cancelProgress > 0.6 ? 1.1 : 1 }}
              />
              <motion.div
                className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center cursor-pointer relative z-10"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                animate={{
                  scale: 1 + cancelProgress * 0.15,
                }}
                whileTap={{ scale: 1.2 }}
              >
                <motion.div
                  className="absolute inset-0 rounded-full bg-red-500"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.4, 0, 0.4],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: 'easeInOut',
                  }}
                />
                <Mic className="w-4 h-4 text-white relative z-10" />
              </motion.div>
              <motion.div
                className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1"
                animate={{
                  opacity: showLockHint ? 1 : 0,
                  y: showLockHint ? 0 : 5,
                }}
              >
                <Lock className="w-3 h-3 text-accent" />
                <span className="text-[10px] text-accent font-medium">Lock</span>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

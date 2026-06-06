import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Send, Trash2, Lock, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRef, useLayoutEffect, useState } from 'react';

interface VoiceRecorderProps {
  mode: 'idle' | 'recording' | 'locked' | 'preview';
  audioLevel: number;
  duration: number;
  recordedBlob: Blob | null;
  uploading: boolean;
  showCancelHint: boolean;
  showLockHint: boolean;
  onCancel: () => void;
  onSend: () => void;
  onStop: () => void;
  onDiscard: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  barRef?: React.RefObject<HTMLDivElement | null>;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const WAVEFORM_BARS = 42;

function Waveform({ level, isActive = false }: { level: number; isActive?: boolean }) {
  const heights = Array.from({ length: WAVEFORM_BARS }, (_, i) => {
    const mid = WAVEFORM_BARS / 2;
    const dist = Math.abs(i - mid) / mid;
    const base = isActive ? 4 + Math.random() * 12 : 3;
    const pulse = level * (1 - dist * 0.5) * 16;
    return Math.max(3, base + pulse);
  });

  return (
    <div className="flex items-center gap-[2px] h-8">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-current"
          animate={{ height: h }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

export function VoiceRecorder({
  mode,
  audioLevel,
  duration,
  recordedBlob,
  uploading,
  showCancelHint,
  showLockHint,
  onCancel,
  onSend,
  onStop,
  onDiscard,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  barRef,
}: VoiceRecorderProps) {
  const isInDanger = showCancelHint || showLockHint;
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useLayoutEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [mode]);

  if (mode === 'idle') return null;

  return (
    <motion.div
      ref={barRef}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: contentHeight || 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="border-b border-border overflow-hidden"
    >
      <div ref={contentRef} className="relative select-none">
        {/* Cancel zone indicator */}
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{
            opacity: showCancelHint ? 1 : 0,
            width: showCancelHint ? 'auto' : 0,
          }}
          className="absolute left-0 top-0 bottom-0 flex items-center pl-3 text-destructive z-10"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          <span className="text-xs font-medium whitespace-nowrap">Release to cancel</span>
        </motion.div>

        {/* Lock zone indicator (shown above the bar) */}
        <AnimatePresence>
          {showLockHint && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-card border border-border/60 shadow-lg rounded-full px-3 py-1 z-10"
            >
              <Lock className="w-3 h-3 text-accent" />
              <span className="text-[10px] font-medium">Release to lock</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recording mode — active recording */}
        {mode === 'recording' && (
          <div
            className="px-3 py-2.5 flex items-center gap-3"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ touchAction: 'none' }}
          >
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'shrink-0 rounded-full transition-colors',
                showCancelHint ? 'text-destructive' : 'text-muted-foreground'
              )}
              onClick={onDiscard}
            >
              <X className="w-4 h-4" />
            </Button>
            <div className="flex-1 flex items-center gap-2">
              <div className={cn(
                'transition-colors',
                isInDanger ? 'text-destructive' : 'text-accent'
              )}>
                <Waveform level={audioLevel} isActive />
              </div>
              <span className={cn(
                'tabular-nums text-sm shrink-0',
                isInDanger ? 'text-destructive' : 'text-accent'
              )}>
                {formatTime(duration)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 rounded-full text-muted-foreground hover:text-foreground h-8 px-2"
                title="Swipe up to lock"
              >
                <Lock className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Locked mode — hands-free recording */}
        {mode === 'locked' && (
          <div className="px-3 py-2.5 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full text-muted-foreground hover:text-destructive"
              onClick={onDiscard}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <div className="flex-1 flex items-center gap-2">
              <div className="text-accent">
                <Waveform level={audioLevel} isActive />
              </div>
              <span className="tabular-nums text-sm text-accent shrink-0">
                {formatTime(duration)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 text-[10px] text-muted-foreground mr-1"
              >
                <Lock className="w-3 h-3 text-accent" />
                <span className="text-accent font-medium">Locked</span>
              </motion.div>
              <Button
                size="sm"
                variant="default"
                className="shrink-0 rounded-full h-8 px-3 text-xs gap-1.5"
                onClick={onStop}
              >
                <div className="w-3 h-3 rounded-full bg-destructive" />
                Stop
              </Button>
            </div>
          </div>
        )}

        {/* Preview mode — review before sending */}
        {mode === 'preview' && recordedBlob && (
          <div className="px-3 py-2.5 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full text-muted-foreground hover:text-destructive"
              onClick={onDiscard}
              disabled={uploading}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <div className="flex-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Waveform level={0.3} isActive={false} />
              <span className="tabular-nums shrink-0">{formatTime(duration)}</span>
            </div>
            <Button
              size="icon"
              className="shrink-0 rounded-full"
              onClick={onSend}
              disabled={uploading}
            >
              {uploading ? (
                <motion.div
                  className="w-4 h-4 border-2 border-background border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

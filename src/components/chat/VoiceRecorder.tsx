import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  waveform: number[];
  duration: number;
  isLocked: boolean;
  isSending: boolean;
  dragX?: number;
  dragY?: number;
  isDragging?: boolean;
  onSend: () => void;
  onCancel: () => void;
  onLock: () => void;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export function VoiceRecorder({
  waveform,
  duration,
  isLocked,
  isSending,
  dragX = 0,
  dragY = 0,
  isDragging = false,
  onSend,
  onCancel,
  onLock,
}: VoiceRecorderProps) {
  const cancelRatio = Math.min(1, Math.max(0, -dragX / 110));
  const lockRatio = Math.min(1, Math.max(0, -dragY / 90));
  const isCancelling = cancelRatio > 0.6;
  const isLocking = lockRatio > 0.6;

  if (isSending) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-4 py-3"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent shrink-0"
        />
        <span className="text-sm text-muted-foreground">Sending voice note...</span>
      </motion.div>
    );
  }

  if (isLocked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="flex items-center gap-2 px-3 py-2"
      >
        <button
          onClick={onCancel}
          className="shrink-0 w-[46px] h-[46px] rounded-full bg-card border border-border/30 flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-transform"
          aria-label="Delete recording"
        >
          <svg viewBox="0 0 24 24" strokeWidth="2" fill="none" stroke="currentColor" width="19" height="19" className="text-destructive">
            <polyline points="3,6 5,6 21,6"/>
            <path d="M19,6l-1,14H6L5,6"/>
            <path d="M10,11v6m4-6v6"/>
            <path d="M9,6V4h6v2"/>
          </svg>
        </button>

        <div className="flex-1 flex items-center gap-2.5 h-[46px] rounded-2xl bg-card border border-border/30 shadow-sm px-3.5">
          <motion.div
            className="w-[7px] h-[7px] rounded-full bg-destructive shrink-0"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
          />
          <span className="text-sm font-mono tabular-nums font-semibold min-w-[38px] shrink-0">
            {formatTime(duration)}
          </span>
          <div className="flex items-center gap-[2px] h-7 flex-1 overflow-hidden">
            {waveform.map((h, i) => (
              <div
                key={i}
                className="w-[3px] rounded-full shrink-0"
                style={{ height: `${Math.max(2, h)}px`, backgroundColor: 'hsl(var(--primary))' }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={onSend}
          className="shrink-0 w-[46px] h-[46px] rounded-full bg-primary flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-transform"
          aria-label="Send voice note"
        >
          <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
            <path d="M22 2L11 13"/>
            <polygon points="22,2 15,22 11,13 2,9"/>
          </svg>
        </button>
      </motion.div>
    );
  }

  return (
    <div className="relative" style={{ touchAction: 'none' }}>
      {/* Recording capsule */}
      <motion.div
        initial={{ opacity: 0, transform: 'scaleX(0.6) translateX(30%)' }}
        animate={{
          opacity: 0.55 + (1 - cancelRatio) * 0.45,
          transform: 'scaleX(1) translateX(0)',
          x: `${Math.min(0, dragX * 0.55)}px`,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="flex items-center gap-2.5 h-[46px] rounded-2xl bg-card border border-border/30 shadow-md px-3.5 overflow-hidden relative mx-3"
        style={{ transformOrigin: 'right center' }}
      >
        {/* Trash hint */}
        <motion.div
          animate={{ opacity: Math.max(0, (cancelRatio - 0.35) * 2.5) }}
          className="absolute left-3 flex items-center gap-1.5 text-destructive text-xs pointer-events-none"
        >
          <svg viewBox="0 0 24 24" strokeWidth="2" fill="none" stroke="currentColor" width="15" height="15">
            <polyline points="3,6 5,6 21,6"/>
            <path d="M19,6l-1,14H6L5,6"/>
            <path d="M10,11v6m4-6v6"/>
            <path d="M9,6V4h6v2"/>
          </svg>
          Cancel
        </motion.div>

        <motion.div
          className="w-2 h-2 rounded-full bg-destructive shrink-0"
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
        />

        <span className="text-sm font-mono tabular-nums font-semibold min-w-[38px] shrink-0">
          {formatTime(duration)}
        </span>

        <div className="flex items-center gap-[2px] h-7 flex-1 overflow-hidden justify-center">
          {waveform.map((h, i) => (
            <motion.div
              key={i}
              className="w-[3px] rounded-full shrink-0"
              style={{ backgroundColor: 'hsl(var(--primary))' }}
              animate={{ height: `${Math.max(2, h)}px` }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            />
          ))}
        </div>

        <motion.div
          animate={{ opacity: Math.max(0, 1 - cancelRatio * 1.5) }}
          className="flex items-center gap-1 text-muted-foreground/60 text-xs whitespace-nowrap pointer-events-none shrink-0"
        >
          <svg viewBox="0 0 24 24" strokeWidth="2" fill="none" stroke="currentColor" width="14" height="14">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          Slide to cancel
        </motion.div>

        <button
          onClick={onCancel}
          className="text-muted-foreground/60 hover:text-destructive transition-colors text-lg leading-none p-1 shrink-0 bg-transparent border-none cursor-pointer"
          aria-label="Cancel recording"
        >
          ✕
        </button>
      </motion.div>

      {/* Lock float */}
      <AnimatePresence>
        {lockRatio > 0.05 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 0.35 + lockRatio * 0.65, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute right-[calc(12px+46px/2-11px)] -top-14 flex flex-col items-center gap-0 pointer-events-none"
          >
            <div className="w-[13px] h-[10px] border-2 border-muted-foreground border-b-0 rounded-t-[7px]" />
            <div className={cn(
              'w-[22px] h-[18px] border-2 rounded-[5px] flex items-center justify-center',
              lockRatio > 0.85 ? 'bg-muted-foreground border-muted-foreground' : 'border-muted-foreground'
            )}>
              <div className={cn(
                'w-full h-full rounded-[3px]',
                lockRatio > 0.85 ? 'bg-muted-foreground' : 'bg-transparent'
              )} />
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5" style={{ opacity: 0.5 + lockRatio * 0.5 }}>↑</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trash icon below mic when cancelling */}
      <AnimatePresence>
        {isCancelling && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute -bottom-6 right-[calc(12px+23px-12px)] pointer-events-none"
          >
            <div className="w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" strokeWidth="2" fill="none" stroke="currentColor" width="11" height="11" className="text-destructive">
                <polyline points="3,6 5,6 21,6"/>
                <path d="M19,6l-1,14H6L5,6"/>
                <path d="M10,11v6m4-6v6"/>
                <path d="M9,6V4h6v2"/>
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

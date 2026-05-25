import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉', '💯', '👏'];

interface MessageReactionsProps {
  reactions: Record<string, string[]>;
  messageId: string;
  currentUserId: string;
  onReact: (messageId: string, emoji: string) => void;
  compact?: boolean;
  alignRight?: boolean;
}

export function MessageReactions({
  reactions,
  messageId,
  currentUserId,
  onReact,
  compact,
  alignRight,
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPicker]);

  const handleReact = useCallback((emoji: string) => {
    onReact(messageId, emoji);
    setShowPicker(false);
  }, [onReact, messageId]);

  const reactionEntries = Object.entries(reactions).filter(
    ([, users]) => users.length > 0
  );

  const myReactions = currentUserId
    ? reactionEntries
        .filter(([, users]) => users.includes(currentUserId))
        .map(([emoji]) => emoji)
    : [];

  const hasReactions = reactionEntries.length > 0;

  return (
    <div className="relative inline-flex" ref={pickerRef}>
      <div className="flex items-center gap-0.5">
        {!compact && hasReactions && (
          <div className="flex items-center gap-0.5">
            {reactionEntries.map(([emoji, users]) => {
              const isMine = myReactions.includes(emoji);
              return (
                <button
                  key={emoji}
                  onClick={() => onReact(messageId, emoji)}
                  className={cn(
                    'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-all duration-150 active:scale-90',
                    isMine
                      ? 'bg-primary/15 border-primary/30 text-primary shadow-sm'
                      : 'bg-secondary/50 border-border/50 hover:bg-secondary hover:border-border text-muted-foreground'
                  )}
                >
                  <span className="text-sm leading-none">{emoji}</span>
                  <span className="text-[10px] font-semibold tabular-nums leading-none">
                    {users.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={() => setShowPicker((p) => !p)}
          className={cn(
            'rounded-full transition-all duration-150 active:scale-90',
            compact
              ? 'p-0.5 hover:bg-secondary/80'
              : 'p-0.5 hover:bg-secondary/80 opacity-50 hover:opacity-100',
            showPicker && (compact ? 'bg-secondary' : 'bg-secondary opacity-100')
          )}
        >
          <SmilePlus
            className={cn(
              'text-muted-foreground',
              compact ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5'
            )}
          />
        </button>
      </div>

      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 6 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className={cn(
              'absolute z-[100] mb-1.5 p-1.5 bg-card border border-border/60 rounded-xl shadow-xl',
              alignRight ? 'bottom-full right-0' : 'bottom-full left-0'
            )}
          >
            <div className="grid grid-cols-5 gap-0.5">
              {REACTIONS.map((emoji) => {
                const isSelected = myReactions.includes(emoji);
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className={cn(
                      'w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-all duration-100 active:scale-90',
                      isSelected
                        ? 'bg-primary/15 ring-1 ring-primary/30 scale-105'
                        : 'hover:bg-secondary/80'
                    )}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmilePlus } from 'lucide-react';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉', '💯', '👏'];

interface MessageReactionsProps {
  reactions: Record<string, string[]>;
  messageId: string;
  currentUserId: string;
  onReact: (messageId: string, emoji: string) => void;
  compact?: boolean;
}

export function MessageReactions({ reactions, messageId, currentUserId, onReact, compact }: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    if (showPicker) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPicker]);

  const hasReactions = Object.keys(reactions).length > 0;
  const myReactions = currentUserId ? Object.entries(reactions)
    .filter(([, users]) => users.includes(currentUserId))
    .map(([emoji]) => emoji) : [];

  return (
    <div className="relative" ref={pickerRef}>
      <div className="flex items-center gap-0.5 flex-wrap">
        {!compact && Object.entries(reactions).map(([emoji, users]) => (
          <button
            key={emoji}
            onClick={() => onReact(messageId, emoji)}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
              myReactions.includes(emoji)
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-secondary/50 border-border hover:bg-secondary'
            }`}
          >
            <span className="text-sm">{emoji}</span>
            <span className="text-[10px] font-medium tabular-nums">{users.length}</span>
          </button>
        ))}
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="p-0.5 rounded-full hover:bg-secondary transition-colors opacity-50 hover:opacity-100"
        >
          <SmilePlus className={compact ? "w-3.5 h-3.5 text-muted-foreground" : "w-3.5 h-3.5"} />
        </button>
      </div>

      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 4 }}
            className="absolute bottom-full left-0 mb-1 p-2 bg-card border rounded-xl shadow-xl grid grid-cols-5 gap-1 z-50"
          >
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { onReact(messageId, emoji); setShowPicker(false); }}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-base hover:bg-secondary transition-colors ${
                  myReactions.includes(emoji) ? 'bg-primary/10 ring-1 ring-primary/30' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

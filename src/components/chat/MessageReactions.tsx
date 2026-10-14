import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmilePlus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const EMOJI_CATEGORIES = [
  {
    name: 'Faces',
    emojis: ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '💯', '👏', '😍', '🤣', '😭', '😤', '🙄', '🤔', '🥺'],
  },
  {
    name: 'Gestures',
    emojis: ['🙏', '💪', '👋', '✌️', '🤝', '✨', '💀', '🎊', '💅', '🤌'],
  },
  {
    name: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💝', '💖'],
  },
  {
    name: 'Reactions',
    emojis: ['🔥', '🎉', '💯', '👏', '🚀', '⭐', '✅', '❌', '💡', '🎯'],
  },
];

const ALL_EMOJIS = EMOJI_CATEGORIES.flatMap(c => c.emojis);

// Keywords so the picker search actually matches something — raw emoji
// glyphs contain no latin text, so a naive substring search always empties.
const EMOJI_KEYWORDS: Record<string, string> = {
  '👍': 'thumbs up like yes good approve',
  '❤️': 'heart love red like',
  '😂': 'laugh lol funny joy tears',
  '😮': 'wow surprised open mouth',
  '😢': 'cry sad tears',
  '🔥': 'fire lit hot popular',
  '🎉': 'party celebrate congrats tada',
  '💯': 'hundred perfect score 100',
  '👏': 'clap applause bravo',
  '😍': 'heart eyes love',
  '🤣': 'laugh rolling floor lol',
  '😭': 'cry sob loud tears',
  '😤': 'angry huff triumph',
  '🙄': 'eyeroll annoyed',
  '🤔': 'thinking hmm',
  '🥺': 'pleading puppy eyes beg',
  '🙏': 'pray please thanks folded hands',
  '💪': 'muscle strong flex',
  '👋': 'wave hi hello bye',
  '✌️': 'victory peace',
  '🤝': 'handshake deal agree',
  '✨': 'sparkles shine new magic',
  '💀': 'skull dead lol',
  '🎊': 'confetti celebrate party',
  '💅': 'nails sassy',
  '🤌': 'pinched fingers italian',
  '🧡': 'orange heart', '💛': 'yellow heart', '💚': 'green heart',
  '💙': 'blue heart', '💜': 'purple heart', '🖤': 'black heart',
  '🤍': 'white heart', '💝': 'gift heart present', '💖': 'sparkling heart',
  '🚀': 'rocket launch fast', '⭐': 'star favorite',
  '✅': 'check yes done correct', '❌': 'cross no wrong x',
  '💡': 'idea light bulb', '🎯': 'target bullseye direct',
};
const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showPicker) return;
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [showPicker]);

  useEffect(() => {
    if (showPicker && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    setSearchQuery('');
  }, [showPicker]);

  const handleReact = useCallback((emoji: string) => {
    onReact(messageId, emoji);
    setShowPicker(false);
  }, [onReact, messageId]);

  const reactionEntries = useMemo(() =>
    Object.entries(reactions).filter(([, users]) => users.length > 0),
    [reactions]
  );

  const myReactions = useMemo(() => {
    if (!currentUserId) return [];
    return reactionEntries
      .filter(([, users]) => users.includes(currentUserId))
      .map(([emoji]) => emoji);
  }, [reactionEntries, currentUserId]);

  const hasReactions = reactionEntries.length > 0;

  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) {
      return EMOJI_CATEGORIES[activeCategory]?.emojis || ALL_EMOJIS;
    }
    const q = searchQuery.toLowerCase().trim();
    const seen = new Set<string>();
    return ALL_EMOJIS.filter(e => {
      if (seen.has(e)) return false;
      seen.add(e);
      return (EMOJI_KEYWORDS[e] || '').includes(q);
    });
  }, [searchQuery, activeCategory]);

  const quickReact = useCallback((emoji: string) => {
    onReact(messageId, emoji);
  }, [onReact, messageId]);

  const showQuickBar = compact && !hasReactions;
  const showCompactPills = compact && hasReactions;

  return (
    <div className="relative" ref={pickerRef}>
      {/* Existing reaction pills (non-compact) */}
      {!compact && hasReactions && (
        <div className="flex flex-wrap gap-1">
          {reactionEntries.map(([emoji, users]) => {
            const isMine = myReactions.includes(emoji);
            return (
              <button
                key={emoji}
                onClick={() => onReact(messageId, emoji)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all duration-150 active:scale-90',
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

          {/* Add reaction button next to pills */}
          <button
            onClick={() => setShowPicker(p => !p)}
            aria-label="Add reaction"
            className={cn(
              'inline-flex items-center rounded-full transition-all duration-150 active:scale-90 px-1.5',
              'bg-secondary/30 border border-dashed border-border/40 hover:bg-secondary hover:border-border/70 text-muted-foreground/60 hover:text-muted-foreground',
              showPicker && 'bg-secondary border-border/70 text-muted-foreground'
            )}
          >
            <SmilePlus className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Compact pills when reactions exist */}
      {showCompactPills && (
        <div className="flex flex-wrap gap-0.5 items-center">
          {reactionEntries.slice(0, 3).map(([emoji, users]) => {
            const isMine = myReactions.includes(emoji);
            return (
              <button
                key={emoji}
                onClick={() => onReact(messageId, emoji)}
                className={cn(
                  'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] border transition-all active:scale-90',
                  isMine
                    ? 'bg-primary/15 border-primary/30 text-primary'
                    : 'bg-secondary/50 border-border/50 text-muted-foreground'
                )}
              >
                <span className="text-xs leading-none">{emoji}</span>
                <span className="text-[9px] font-semibold tabular-nums leading-none">{users.length}</span>
              </button>
            );
          })}
          {reactionEntries.length > 3 && (
            <span className="text-[9px] text-muted-foreground px-0.5">+{reactionEntries.length - 3}</span>
          )}
          <button
            onClick={() => setShowPicker(p => !p)}
            aria-label="Add reaction"
            className="inline-flex items-center rounded-full px-1 text-muted-foreground/60 hover:text-muted-foreground active:scale-90"
          >
            <SmilePlus className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Quick reaction bar (compact hover mode, no reactions yet) */}
      {showQuickBar && (
        <div className="flex items-center gap-0.5">
          {QUICK_EMOJIS.map(emoji => {
            const isSelected = myReactions.includes(emoji);
            return (
              <button
                key={emoji}
                onClick={() => quickReact(emoji)}
                aria-label={`React with ${emoji}`}
                className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-full text-sm transition-all duration-100 active:scale-90',
                  isSelected
                    ? 'bg-primary/20 scale-110'
                    : 'hover:bg-secondary/80 hover:scale-110'
                )}
              >
                {emoji}
              </button>
            );
          })}
          <button
            onClick={() => setShowPicker(p => !p)}
            aria-label="More reactions"
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded-full transition-all duration-100 active:scale-90',
              showPicker ? 'bg-secondary' : 'hover:bg-secondary/80'
            )}
          >
            <SmilePlus className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Add reaction button for non-compact when no reactions exist */}
      {!compact && !hasReactions && (
        <button
          onClick={() => setShowPicker(p => !p)}
          aria-label="Add reaction"
          className={cn(
            'rounded-full transition-all duration-150 active:scale-90 p-0.5',
            'hover:bg-secondary/80 opacity-50 hover:opacity-100',
            showPicker && 'bg-secondary opacity-100'
          )}
        >
          <SmilePlus className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}

      {/* Emoji Picker */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className={cn(
              'absolute z-[100] mb-2 w-[280px] bg-card border border-border/60 rounded-xl shadow-2xl overflow-hidden',
              alignRight ? 'bottom-full right-0' : 'bottom-full left-0'
            )}
          >
            {/* Search */}
            <div className="relative p-2 pb-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search emojis..."
                className="w-full bg-secondary/40 border border-border/40 rounded-lg pl-8 pr-7 py-1.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3 h-3 text-muted-foreground/60" />
                </button>
              )}
            </div>

            {/* Category tabs (hidden when searching) */}
            {!searchQuery.trim() && (
              <div className="flex gap-1 px-2 py-1.5 overflow-x-auto scrollbar-none border-b border-border/30">
                {EMOJI_CATEGORIES.map((cat, idx) => (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(idx)}
                    className={cn(
                      'text-[10px] px-2 py-1 rounded-md whitespace-nowrap transition-colors',
                      idx === activeCategory
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground/70 hover:text-muted-foreground hover:bg-secondary/50'
                    )}
                  >
                    {cat.emojis[0]} {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Emoji grid */}
            <div className="p-2 max-h-[200px] overflow-y-auto scrollbar-thin">
              <div className="grid grid-cols-6 gap-0.5">
                {(searchQuery.trim() ? filteredEmojis : EMOJI_CATEGORIES[activeCategory].emojis).map(emoji => {
                  const isSelected = myReactions.includes(emoji);
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReact(emoji)}
                      aria-label={`React with ${emoji}`}
                      className={cn(
                        'w-[42px] h-[42px] flex items-center justify-center rounded-lg text-xl transition-all duration-100 active:scale-90',
                        isSelected
                          ? 'bg-primary/15 ring-1 ring-primary/30 scale-110'
                          : 'hover:bg-secondary/80 hover:scale-110'
                      )}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

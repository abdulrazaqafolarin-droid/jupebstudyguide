import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Copy, Pencil, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import MathRenderer from '@/components/MathRenderer';
import QuestionRefChips from '@/components/QuestionRefChips';
import type { AIMessage } from '@/hooks/useAITutorChats';
import type { ActiveStudyTopic } from '@/hooks/useStudyChat';
import { buildStarterPrompts } from '@/lib/study-chat';

interface ThreadViewProps {
  messages: AIMessage[];
  isStreaming: boolean;
  streamError: string | null;
  editingIndex: number | null;
  activeTopic: ActiveStudyTopic | null;
  onEdit: (index: number, text: string) => void;
  onRetry: () => void;
  onStarter: (text: string) => void;
  starterPrompts?: string[];
  emptyTitle?: string;
  emptyDescription?: string;
  /** Compact presentation used by the floating tutor; full-page chat stays unchanged. */
  compact?: boolean;
}

const GENERIC_STARTERS = [
  'Explain a concept I find hard',
  'Quiz me on a topic',
  'Help me revise for JUPEB',
  'Work a past question step by step',
];

function TypingDots({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn('flex items-center', compact ? 'gap-1 px-1' : 'gap-1.5 px-1 py-1')} aria-label="Tutor is thinking">
      {[0, 1, 2].map((i) => (
        compact ? (
          <motion.span
            key={i}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
            className="h-1.5 w-1.5 rounded-full bg-primary/60"
          />
        ) : (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        )
      ))}
    </div>
  );
}

async function copyMessage(content: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(content);
    } else {
      const area = document.createElement('textarea');
      area.value = content;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand('copy');
      area.remove();
      if (!copied) throw new Error('Clipboard unavailable');
    }
    toast.success('Copied');
  } catch {
    toast.error('Could not copy');
  }
}

/**
 * Shared thread renderer. The regular full-page layout remains the default;
 * compact mode gives the floating tutor the same denser message rhythm and
 * animated quick prompts as the original JUPEB floating tutor.
 */
export function ThreadView({
  messages,
  isStreaming,
  streamError,
  editingIndex,
  activeTopic,
  onEdit,
  onRetry,
  onStarter,
  starterPrompts,
  emptyTitle,
  emptyDescription,
  compact = false,
}: ThreadViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [messages.length, isStreaming, streamError]);

  const starters = starterPrompts ?? (activeTopic
    ? buildStarterPrompts(activeTopic.topic.name, activeTopic.subtopic)
    : GENERIC_STARTERS);
  const lastMessage = messages[messages.length - 1];
  const showTyping = isStreaming && (!lastMessage || lastMessage.role === 'user' || !lastMessage.content);

  return (
    <div className={cn('mx-auto w-full', compact ? 'max-w-none px-1 py-2' : 'max-w-3xl px-4 py-6')}>
      {messages.length === 0 && !isStreaming && (
        <div className={cn('text-center', compact ? 'flex h-full min-h-[240px] flex-col justify-center px-1 py-3' : 'py-8')}>
          <motion.div
            initial={compact ? { opacity: 0, scale: 0.8 } : false}
            animate={compact ? { opacity: 1, scale: 1 } : undefined}
            className={cn('mx-auto flex items-center justify-center rounded-full bg-primary/15', compact ? 'mb-3 h-12 w-12' : 'mb-4 h-12 w-12')}
          >
            {compact ? (
              <motion.span
                animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles className="h-6 w-6 text-primary" />
              </motion.span>
            ) : (
              <Bot className="h-6 w-6 text-primary" />
            )}
          </motion.div>
          <h2 className={cn('font-semibold', compact ? 'mb-1 text-sm' : 'text-lg')}>
            {activeTopic ? `${activeTopic.topic.name} study room` : (emptyTitle ?? 'AI Study Tutor')}
          </h2>
          <p className={cn('mx-auto text-muted-foreground', compact ? 'mb-4 max-w-sm text-xs' : 'mt-1 max-w-md text-sm')}>
            {activeTopic
              ? `Ask anything about ${activeTopic.subtopic ?? activeTopic.topic.name} — I'll teach it step by step and check your understanding.`
              : (emptyDescription ?? 'Ask me anything about your studies and I will explain it step by step.')}
          </p>
          {compact ? (
            <motion.div
              className="grid w-full grid-cols-2 gap-2"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } }}
            >
              {starters.map((prompt) => (
                <motion.button
                  key={prompt}
                  type="button"
                  onClick={() => onStarter(prompt)}
                  whileHover={{ scale: 1.03, borderColor: 'hsla(38, 92%, 50%, 0.4)' }}
                  whileTap={{ scale: 0.97 }}
                  variants={{
                    hidden: { opacity: 0, y: 10, scale: 0.95 },
                    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 24 } },
                  }}
                  className="flex min-h-12 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-left text-xs text-muted-foreground transition-colors hover:bg-primary/[0.06] hover:text-foreground"
                >
                  <Sparkles className="h-3 w-3 shrink-0 text-primary" />
                  <span className="line-clamp-2">{prompt}</span>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {starters.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onStarter(prompt)}
                  className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={cn(compact ? 'space-y-3' : 'space-y-5')}>
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id ?? `m-${i}`}
              layout={compact}
              initial={compact ? { opacity: 0, y: 14, scale: 0.96 } : false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={compact ? { opacity: 0, y: -10, scale: 0.96 } : undefined}
              transition={compact ? { type: 'spring', stiffness: 220, damping: 26, mass: 0.8 } : undefined}
              className={cn('group flex', compact ? 'gap-2' : 'gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {msg.role === 'assistant' && (
                <div className={cn('mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-primary/15', compact ? 'h-6 w-6' : 'h-7 w-7')}>
                  <Bot className={cn('text-primary', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
                </div>
              )}
              <div
                className={cn(
                  'relative min-w-0',
                  compact ? 'max-w-[88%] rounded-xl px-3 py-2 text-xs' : 'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                  msg.role === 'assistant'
                    ? 'border border-white/5 bg-white/[0.06] text-foreground'
                    : 'bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-sm shadow-primary/20',
                  editingIndex === i && (compact ? 'ring-2 ring-primary/80 ring-offset-1 ring-offset-background' : 'ring-2 ring-primary/80 ring-offset-2 ring-offset-background'),
                )}
                style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
              >
                {msg.attachment && (
                  <div className={cn('mb-2 flex items-center gap-2 rounded-lg border border-current/15 bg-black/5', compact ? 'px-2 py-1 text-[10px]' : 'px-2 py-1.5 text-xs')}>
                    <span aria-hidden="true">📎</span>
                    <span className="truncate">{msg.attachment.name}</span>
                  </div>
                )}
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm prose-invert max-w-full min-w-0 break-words [overflow-wrap:anywhere]">
                    <MathRenderer content={msg.content} className={compact ? 'text-xs leading-relaxed' : 'text-sm leading-relaxed'} />
                  </div>
                ) : (
                  <p className={cn('whitespace-pre-wrap break-words [overflow-wrap:anywhere]', compact ? 'text-xs' : 'text-sm')}>{msg.content}</p>
                )}
                {msg.role === 'assistant' && msg.questionRefs && msg.questionRefs.length > 0 && (
                  <QuestionRefChips refs={msg.questionRefs} />
                )}
                {msg.content && (
                  <div className="absolute -top-2 right-1 hidden rounded-md border border-white/10 bg-background/90 px-1 py-0.5 shadow-sm backdrop-blur-md group-hover:flex">
                    <button
                      type="button"
                      onClick={() => void copyMessage(msg.content!)}
                      className="rounded p-1 hover:bg-white/10"
                      title="Copy message"
                      aria-label="Copy message"
                    >
                      <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                    {msg.role === 'user' && !isStreaming && (
                      <button
                        type="button"
                        onClick={() => onEdit(i, msg.content!)}
                        className="rounded p-1 hover:bg-white/10"
                        title="Edit message"
                        aria-label="Edit message"
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className={cn('mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-primary/20', compact ? 'h-6 w-6' : 'h-7 w-7')}>
                  <span className={cn('font-medium text-primary', compact ? 'text-[9px]' : 'text-[10px]')}>You</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {showTyping && (
          <motion.div
            initial={compact ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            className={cn('flex', compact ? 'gap-2' : 'gap-3')}
          >
            <div className={cn('flex shrink-0 items-center justify-center rounded-full bg-primary/15', compact ? 'h-6 w-6' : 'h-7 w-7')}>
              <Bot className={cn('text-primary', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
            </div>
            <div className={cn('border border-white/5 bg-white/[0.06]', compact ? 'rounded-xl px-3 py-2' : 'rounded-2xl px-4 py-2.5')}>
              <TypingDots compact={compact} />
            </div>
          </motion.div>
        )}
      </div>

      {streamError && !isStreaming && (
        <div className={cn('rounded-xl border border-destructive/40 bg-destructive/5', compact ? 'mt-3 px-3 py-2' : 'mt-5 px-4 py-3')}>
          <div className="flex flex-wrap items-center gap-3">
            <p className={cn('min-w-0 flex-1 text-destructive', compact ? 'text-xs' : 'text-sm')}>{streamError}</p>
            <Button size="sm" variant="outline" className={cn('h-7 gap-1.5', compact && 'text-xs')} onClick={onRetry}>
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

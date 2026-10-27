import { useEffect, useRef } from 'react';
import { Bot, Copy, Pencil, RotateCcw } from 'lucide-react';
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
}

const GENERIC_STARTERS = [
  'Explain a concept I find hard',
  'Quiz me on a topic',
  'Help me revise for JUPEB',
  'Work a past question step by step',
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-1" aria-label="Tutor is thinking">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

function copyMessage(content: string) {
  navigator.clipboard
    .writeText(content)
    .then(() => toast.success('Copied'))
    .catch(() => toast.error('Could not copy'));
}

/**
 * The thread: empty-state starters, message bubbles (math-rendered for the
 * tutor), typing indicator, and the pre-token error card with Retry.
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
}: ThreadViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Follow new content (message added / stream started / error → retry).
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [messages.length, isStreaming, streamError]);

  const starters = activeTopic
    ? buildStarterPrompts(activeTopic.topic.name, activeTopic.subtopic)
    : GENERIC_STARTERS;
  const lastMessage = messages[messages.length - 1];
  const showTyping = isStreaming && (!lastMessage || lastMessage.role === 'user');

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      {messages.length === 0 && !isStreaming && (
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">
            {activeTopic ? `${activeTopic.topic.name} study room` : 'AI Study Tutor'}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {activeTopic
              ? `Ask anything about ${activeTopic.subtopic ?? activeTopic.topic.name} — I'll teach it step by step and check your understanding.`
              : 'Ask me anything about your studies and I will explain it step by step.'}
          </p>
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
        </div>
      )}

      <div className="space-y-5">
        {messages.map((msg, i) => (
          <div
            key={msg.id ?? `m-${i}`}
            className={cn('group flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            {msg.role === 'assistant' && (
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div
              className={cn(
                'relative max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                msg.role === 'assistant'
                  ? 'border border-white/5 bg-white/[0.06] text-foreground'
                  : 'bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-sm shadow-primary/20',
                editingIndex === i && 'ring-2 ring-primary/80 ring-offset-2 ring-offset-background',
              )}
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm prose-invert max-w-full min-w-0 break-words [overflow-wrap:anywhere]">
                  <MathRenderer content={msg.content} className="text-sm leading-relaxed" />
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.content}</p>
              )}
              {msg.role === 'assistant' && msg.questionRefs && msg.questionRefs.length > 0 && (
                <QuestionRefChips refs={msg.questionRefs} />
              )}
              {msg.content && (
                <div className="absolute -top-2.5 right-1 hidden rounded-md border border-white/10 bg-background/90 px-1 py-0.5 shadow-sm backdrop-blur-md group-hover:flex">
                  <button
                    type="button"
                    onClick={() => copyMessage(msg.content!)}
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
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20">
                <span className="text-[10px] font-medium text-primary">You</span>
              </div>
            )}
          </div>
        ))}

        {showTyping && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.06] px-4 py-2.5">
              <TypingDots />
            </div>
          </div>
        )}
      </div>

      {streamError && !isStreaming && (
        <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 text-sm text-destructive">{streamError}</p>
            <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={onRetry}>
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

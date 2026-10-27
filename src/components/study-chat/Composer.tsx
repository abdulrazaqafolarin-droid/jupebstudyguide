import { useEffect, useRef, type FormEvent } from 'react';
import { Pencil, Send, Square, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  placeholder: string;
  editing: boolean;
  onCancelEdit: () => void;
}

/**
 * ChatGPT-style input: auto-growing textarea, Enter to send /
 * Shift+Enter for a newline, morphing send ↔ stop button, and the
 * edit-rewind banner while a pending edit is staged.
 */
export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  placeholder,
  editing,
  onCancelEdit,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  useEffect(() => {
    if (!editing) return;
    textareaRef.current?.focus();
  }, [editing]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!value.trim() || isStreaming) return;
    onSend();
  };

  return (
    <div className="shrink-0 border-t border-border/60 bg-background/70 px-3 py-3 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-3xl">
        {editing && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-muted-foreground">
            <Pencil className="h-3 w-3 shrink-0" />
            <span className="flex-1 truncate">
              Editing message — the thread rewinds when you re-send
            </span>
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded p-1 hover:bg-white/10"
              title="Cancel edit"
              aria-label="Cancel edit"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <form onSubmit={submit} className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={placeholder}
            disabled={isStreaming}
            aria-label="Message the tutor"
            className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-border/70 bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-60"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              title="Stop response"
              aria-label="Stop response"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-sm transition-opacity hover:opacity-90"
            >
              <Square className="h-3.5 w-3.5" fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!value.trim()}
              title="Send message"
              aria-label="Send message"
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm transition-colors',
                value.trim()
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'cursor-not-allowed bg-muted text-muted-foreground',
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </form>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          AI can make mistakes — verify important answers.
        </p>
      </div>
    </div>
  );
}

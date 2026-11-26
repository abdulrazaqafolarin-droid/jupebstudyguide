import { useEffect, useRef, type FormEvent } from 'react';
import { Pencil, Send, Square, X, Plus, FileText } from 'lucide-react';
import { useAttachment } from '@/hooks/useAttachment';
import { cn } from '@/lib/utils';

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (attachment: { base64: string; mimeType: string; name: string } | null) => void;
  onStop: () => void;
  isStreaming: boolean;
  placeholder: string;
  editing: boolean;
  onCancelEdit: () => void;
  /** Compact control sizing for the floating tutor; default layout is unchanged. */
  compact?: boolean;
}

/**
 * Shared ChatGPT-style input: auto-growing textarea, Enter to send /
 * Shift+Enter for a newline, morphing send ↔ stop button, attachments and
 * the edit-rewind banner. Compact mode mirrors the JUPEB floating composer.
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
  compact = false,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { attachment, isProcessing, addAttachment, clearAttachment } = useAttachment();

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, compact ? 80 : 160)}px`;
  }, [value, compact]);

  useEffect(() => {
    if (!editing) return;
    textareaRef.current?.focus();
  }, [editing]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if ((!value.trim() && !attachment) || isStreaming || isProcessing) return;
    onSend(attachment ? { base64: attachment.base64, mimeType: attachment.mimeType, name: attachment.name } : null);
    clearAttachment();
  };

  return (
    <div className={cn(
      'shrink-0 border-t backdrop-blur-sm',
      compact
        ? 'border-white/5 bg-background/30 px-3 py-3'
        : 'border-border/60 bg-background/70 px-3 py-3',
    )}>
      <div className={cn('mx-auto w-full', compact ? 'max-w-none' : 'max-w-3xl')}>
        {editing && (
          <div className={cn(
            'mb-2 flex items-center gap-2 text-muted-foreground',
            compact
              ? 'border-b border-white/5 pb-2 text-[11px]'
              : 'rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs',
          )}>
            <Pencil className="h-3 w-3 shrink-0" />
            <span className="flex-1 truncate">Editing message — the thread rewinds when you re-send</span>
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded p-1 transition-colors hover:bg-white/10"
              title="Cancel edit"
              aria-label="Cancel edit"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {attachment && (
          <div className={cn(
            'mb-2 flex items-center gap-2 rounded-lg border text-xs',
            compact ? 'border-white/10 bg-white/[0.03] px-2 py-1.5' : 'border-border/70 bg-card px-3 py-2',
          )}>
            <FileText className={cn('shrink-0', compact ? 'h-3.5 w-3.5 text-primary' : 'h-4 w-4')} />
            <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
            <button type="button" onClick={clearAttachment} aria-label="Remove attachment" className="rounded p-1 hover:bg-white/10">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <form onSubmit={submit} className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,.gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void addAttachment(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming || isProcessing || editing}
            aria-label="Attach a file"
            title="Attach a file"
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              compact
                ? 'h-8 w-8 bg-primary/10 text-primary hover:bg-primary/20'
                : 'h-10 w-10 border border-border bg-card text-foreground',
            )}
          >
            {isProcessing ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Plus className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
            )}
          </button>
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
            className={cn(
              'min-w-0 flex-1 resize-none rounded-xl border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 disabled:opacity-60',
              compact
                ? 'min-h-[40px] max-h-[80px] bg-white/5 border-white/10 px-3 py-2 text-sm focus:border-primary/40 focus:ring-primary/20'
                : 'min-h-[44px] max-h-40 border-border/70 bg-card px-3.5 py-2.5 text-sm focus:border-primary/50 focus:ring-primary/30',
            )}
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              title="Stop response"
              aria-label="Stop response"
              className={cn(
                'flex shrink-0 items-center justify-center rounded-full shadow-sm transition-opacity hover:opacity-90',
                compact ? 'h-8 w-8 bg-foreground text-background' : 'h-10 w-10 bg-foreground text-background',
              )}
            >
              <Square className="h-3.5 w-3.5" fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={(!value.trim() && !attachment) || isProcessing}
              title="Send message"
              aria-label="Send message"
              className={cn(
                'flex shrink-0 items-center justify-center rounded-full shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                compact ? 'h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90' : 'h-10 w-10',
                !compact && (value.trim()
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'cursor-not-allowed bg-muted text-muted-foreground'),
              )}
            >
              <Send className={compact ? 'h-4 w-4' : 'h-4 w-4'} />
            </button>
          )}
        </form>
        {!compact && (
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            AI can make mistakes — verify important answers.
          </p>
        )}
      </div>
    </div>
  );
}

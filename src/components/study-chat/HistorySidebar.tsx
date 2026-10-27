import { useMemo, useState, type FormEvent } from 'react';
import { Check, MessageSquare, Pencil, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type StudyChatMeta, groupChatsByDate } from '@/lib/study-chat';

interface HistorySidebarProps {
  chats: StudyChatMeta[];
  activeChatId: string | null;
  loading: boolean;
  onSelect: (chatId: string) => void;
  onNewChat: () => void;
  onRename: (chatId: string, title: string) => void;
  onDelete: (chatId: string) => void;
  onClose?: () => void;
}

/**
 * ChatGPT-style conversation history: search, date-grouped list, active
 * highlight, hover rename/delete with inline confirm (never window.confirm
 * — the WebView modal blocks the UI thread).
 */
export function HistorySidebar({
  chats,
  activeChatId,
  loading,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
  onClose,
}: HistorySidebarProps) {
  const [search, setSearch] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (chat) =>
        chat.title.toLowerCase().includes(q) ||
        (chat.subtopic ?? '').toLowerCase().includes(q),
    );
  }, [chats, search]);

  const groups = useMemo(() => groupChatsByDate(filtered), [filtered]);

  const startRename = (chat: StudyChatMeta) => {
    setDeletingId(null);
    setRenamingId(chat.id);
    setRenameValue(chat.title);
  };

  const commitRename = (chatId: string) => {
    if (renameValue.trim()) onRename(chatId, renameValue);
    setRenamingId(null);
    setRenameValue('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="truncate text-sm font-semibold">Study Chat</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onNewChat}>
            <Plus className="h-3 w-3" /> New
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
              aria-label="Close history"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="shrink-0 px-2.5 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history"
            aria-label="Search chat history"
            className="w-full rounded-md border border-border/60 bg-background/60 py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 pb-3">
        {loading && (
          <p className="px-1.5 py-2 text-xs text-muted-foreground">Loading chats…</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="px-1.5 py-2 text-xs text-muted-foreground">
            {search
              ? 'No chats match your search.'
              : 'No chats yet — open a topic from the syllabus to start one.'}
          </p>
        )}
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.chats.map((chat) => {
                const active = chat.id === activeChatId;
                if (renamingId === chat.id) {
                  return (
                    <form
                      key={chat.id}
                      onSubmit={(e: FormEvent) => {
                        e.preventDefault();
                        commitRename(chat.id);
                      }}
                      className="flex items-center gap-1 rounded-lg border border-primary/40 bg-background px-1.5 py-1"
                    >
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => commitRename(chat.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setRenamingId(null);
                            setRenameValue('');
                          }
                        }}
                        aria-label="Chat name"
                        className="min-w-0 flex-1 bg-transparent px-1 py-0.5 text-xs focus:outline-none"
                      />
                      <button type="submit" className="rounded p-1 hover:bg-white/10" aria-label="Save name">
                        <Check className="h-3 w-3 text-primary" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1 hover:bg-white/10"
                        aria-label="Cancel rename"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setRenamingId(null);
                          setRenameValue('');
                        }}
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </form>
                  );
                }
                if (deletingId === chat.id) {
                  return (
                    <div
                      key={chat.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-2 py-1.5"
                    >
                      <span className="truncate text-xs text-muted-foreground">Delete this chat?</span>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingId(null);
                            onDelete(chat.id);
                          }}
                          className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="rounded border border-border px-1.5 py-0.5 text-[10px]"
                        >
                          Keep
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={chat.id} className="group relative rounded-lg">
                    <button
                      type="button"
                      onClick={() => onSelect(chat.id)}
                      className={cn(
                        'block w-full rounded-lg px-2.5 py-2 text-left transition-colors',
                        active
                          ? 'bg-primary/10 text-foreground'
                          : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground',
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3 shrink-0" />
                        <span className="truncate text-xs font-medium">{chat.title}</span>
                      </span>
                      {chat.subtopic && (
                        <span className="ml-[18px] mt-0.5 block truncate text-[10px] opacity-70">
                          {chat.subtopic}
                        </span>
                      )}
                    </button>
                    <div className="absolute right-1 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md bg-background/90 px-1 py-0.5 shadow-sm group-hover:flex">
                      <button
                        type="button"
                        className="rounded p-1 hover:bg-white/10"
                        aria-label="Rename chat"
                        title="Rename"
                        onClick={() => startRename(chat)}
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1 hover:bg-white/10"
                        aria-label="Delete chat"
                        title="Delete"
                        onClick={() => {
                          setRenamingId(null);
                          setDeletingId(chat.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

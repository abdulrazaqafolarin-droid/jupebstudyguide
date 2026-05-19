import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, Check, Trash2, Trophy, Flame, CalendarDays, Crown, Sparkles, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { AppNotification, NotificationKind } from '@/hooks/useNotifications';

const ICONS: Record<NotificationKind, React.ComponentType<{ className?: string }>> = {
  achievement: Trophy,
  streak: Flame,
  syllabus: CalendarDays,
  rank: Crown,
  reminder: Sparkles,
  info: Info,
};

const ACCENT: Record<NotificationKind, string> = {
  achievement: 'text-primary',
  streak: 'text-destructive',
  syllabus: 'text-accent',
  rank: 'text-primary',
  reminder: 'text-primary',
  info: 'text-muted-foreground',
};

function formatRelative(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

interface Props {
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onClear: () => void;
  permission: NotificationPermission;
  onRequestPermission: () => void;
}

export function NotificationCenter({
  notifications,
  unreadCount,
  onMarkAllRead,
  onClear,
  permission,
  onRequestPermission,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v && unreadCount > 0) {
          // Mark read shortly after opening so the badge clears on next render.
          setTimeout(onMarkAllRead, 800);
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          {unreadCount > 0 ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-md"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(92vw,360px)] p-0 overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40">
          <div>
            <p className="font-semibold text-sm">Notifications</p>
            <p className="text-[11px] text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={onMarkAllRead}
                  className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition"
                  title="Mark all read"
                  aria-label="Mark all read"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onClear}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                  title="Clear all"
                  aria-label="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {permission === 'default' && (
          <div className="px-4 py-3 border-b border-border bg-primary/5">
            <p className="text-xs text-foreground mb-2">
              Get reminders even when this tab is closed.
            </p>
            <Button
              size="sm"
              onClick={onRequestPermission}
              className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Enable browser notifications
            </Button>
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                Achievements, streaks and reminders will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => {
                const Icon = ICONS[n.kind] ?? Info;
                return (
                  <motion.li
                    key={n.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    className={cn(
                      'flex gap-3 px-4 py-3 transition-colors',
                      !n.read && 'bg-primary/5',
                    )}
                  >
                    <div
                      className={cn(
                        'flex-shrink-0 w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center',
                        ACCENT[n.kind],
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug [overflow-wrap:anywhere]">
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground leading-snug mt-0.5 [overflow-wrap:anywhere]">
                        {n.body}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatRelative(n.createdAt)}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="flex-shrink-0 self-start mt-1 w-2 h-2 rounded-full bg-primary" />
                    )}
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

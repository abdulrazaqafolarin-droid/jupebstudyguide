import { Check, CheckCheck, Clock, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageState } from '@/lib/dm-store';

interface Props {
  state: MessageState;
  className?: string;
}

export function MessageStatusIcon({ state, className }: Props) {
  switch (state) {
    case 'pending':
      return <Clock className={cn('w-3.5 h-3.5 text-muted-foreground', className)} />;
    case 'sending':
      return <Loader2 className={cn('w-3.5 h-3.5 text-muted-foreground animate-spin', className)} />;
    case 'sent':
      return <Check className={cn('w-3.5 h-3.5 text-muted-foreground', className)} />;
    case 'delivered':
      return <CheckCheck className={cn('w-3.5 h-3.5 text-muted-foreground', className)} />;
    case 'read':
      return <CheckCheck className={cn('w-3.5 h-3.5 text-primary', className)} />;
  }
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'Now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatFullTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDateChip(iso: string): string {
  const d = new Date(iso);
  const now = new Date();

  if (d.toDateString() === now.toDateString()) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

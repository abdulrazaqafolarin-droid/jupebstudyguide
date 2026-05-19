import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  url?: string | null;
  name?: string | null;
  className?: string;
}

function initials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({ url, name, className }: UserAvatarProps) {
  return (
    <Avatar className={cn('ring-2 ring-primary/20', className)}>
      {url ? <AvatarImage src={url} alt={name ?? 'User'} /> : null}
      <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/30 text-foreground font-semibold">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

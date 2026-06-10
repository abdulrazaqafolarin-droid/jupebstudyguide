import { useRef, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useProfilePhotoViewer } from '@/components/ProfilePhotoViewer';

interface UserAvatarProps {
  url?: string | null;
  name?: string | null;
  className?: string;
  viewable?: boolean;
  statusText?: string;
  isOwn?: boolean;
  onOwnPhotoAction?: () => void;
  fallback?: React.ReactNode;
  targetUserId?: string;
}

function initials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({ url, name, className, viewable, statusText, isOwn, onOwnPhotoAction, fallback, targetUserId }: UserAvatarProps) {
  const { openViewer } = useProfilePhotoViewer();
  const tapRef = useRef<HTMLDivElement>(null);

  const showUrl = url;
  const isViewable = viewable;

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isViewable) {
      e.stopPropagation();
      e.preventDefault();
      openViewer({
        url: showUrl || '',
        name,
        originRect: tapRef.current?.getBoundingClientRect() || null,
        isOwn,
        statusText,
        onOwnPhotoAction,
      });
    }
  }, [isViewable, showUrl, name, isOwn, statusText, onOwnPhotoAction, openViewer]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isViewable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openViewer({
        url: showUrl || '',
        name,
        originRect: tapRef.current?.getBoundingClientRect() || null,
        isOwn,
        statusText,
        onOwnPhotoAction,
      });
    }
  }, [isViewable, showUrl, name, isOwn, statusText, onOwnPhotoAction, openViewer]);

  return (
    <Avatar
      ref={tapRef}
      className={cn(
        'ring-2 ring-primary/20',
        isViewable && 'cursor-pointer hover:ring-primary/40 transition-all',
        className
      )}
      onClick={isViewable ? handleClick : undefined}
      onKeyDown={isViewable ? handleKeyDown : undefined}
      tabIndex={isViewable ? 0 : undefined}
      role={isViewable ? 'button' : undefined}
      aria-label={isViewable && name ? `${name}'s profile photo. Tap to view.` : undefined}
    >
      {showUrl ? <AvatarImage src={showUrl} alt={name ?? 'User'} /> : null}
      <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/30 text-foreground font-semibold">
        {fallback ?? initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

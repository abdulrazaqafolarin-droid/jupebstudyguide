import { useRef, useCallback, useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useProfilePhotoViewer } from '@/components/ProfilePhotoViewer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

const accessCache = new Map<string, boolean>();

function initials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({ url, name, className, viewable, statusText, isOwn, onOwnPhotoAction, fallback, targetUserId }: UserAvatarProps) {
  const { user } = useAuth();
  const { openViewer } = useProfilePhotoViewer();
  const tapRef = useRef<HTMLDivElement>(null);
  const [canView, setCanView] = useState<boolean | null>(null);

  useEffect(() => {
    if (!targetUserId || !user || isOwn) {
      setCanView(true);
      return;
    }
    const cacheKey = `${user.id}_${targetUserId}`;
    if (accessCache.has(cacheKey)) {
      setCanView(accessCache.get(cacheKey)!);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.rpc('can_view_profile_photo', { p_target_user_id: targetUserId });
        if (!cancelled) {
          const allowed = data !== false;
          accessCache.set(cacheKey, allowed);
          setCanView(allowed);
        }
      } catch {
        if (!cancelled) setCanView(true);
      }
    })();
    return () => { cancelled = true; };
  }, [targetUserId, user, isOwn]);

  const showUrl = canView !== false ? url : null;
  const isViewable = viewable && canView !== false;

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isViewable) {
      e.stopPropagation();
      e.preventDefault();
      openViewer({
        url: url || '',
        name,
        originRect: tapRef.current?.getBoundingClientRect() || null,
        isOwn,
        statusText,
        onOwnPhotoAction,
      });
    }
  }, [isViewable, url, name, isOwn, statusText, onOwnPhotoAction, openViewer]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isViewable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openViewer({
        url: url || '',
        name,
        originRect: tapRef.current?.getBoundingClientRect() || null,
        isOwn,
        statusText,
        onOwnPhotoAction,
      });
    }
  }, [isViewable, url, name, isOwn, statusText, onOwnPhotoAction, openViewer]);

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

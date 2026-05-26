import { useState, useEffect, useRef } from 'react';
import { Search, MessageSquare, Users, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Conversation, Profile } from '@/hooks/useChat';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/UserAvatar';
import { GroupCreateDialog } from './GroupCreateDialog';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversation: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onStartConversation: (userId: string) => void;
  searchUsers: (query: string) => Promise<Profile[]>;
  isOnline: (userId: string) => boolean;
  friendRequestCount?: number;
  onGroupCreated?: (conversationId: string) => void;
  onFriendRequestsClick?: () => void;
  onProfileClick?: (userId: string) => void;
  markingRead?: Set<string>;
  staleUnread?: boolean;
}

export function ChatSidebar({
  conversations,
  activeConversation,
  loading,
  onSelect,
  onStartConversation,
  searchUsers,
  isOnline,
  friendRequestCount,
  onGroupCreated,
  onFriendRequestsClick,
  onProfileClick,
  markingRead,
  staleUnread,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userResults, setUserResults] = useState<Profile[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showGroupCreate, setShowGroupCreate] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (userSearchQuery.trim().length < 2) { setUserResults([]); return; }
    setSearchingUsers(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await searchUsers(userSearchQuery);
      setUserResults(results);
      setSearchingUsers(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [userSearchQuery, searchUsers]);

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const name = c.is_group ? c.group_name : c.other_user?.display_name;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search bar */}
      <div className="p-3 pb-1 space-y-2 shrink-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary/50 border-border/50 h-9 text-sm"
            />
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0 h-9 w-9"
            onClick={() => setShowGroupCreate(true)}
            title="Create group"
          >
            <Users className="w-4 h-4" />
          </Button>
        </div>

        {/* User search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Find people to chat with..."
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            className="pl-8 bg-secondary/30 border-border/30 h-8 text-xs"
          />
        </div>
      </div>

      {/* User search results */}
      <AnimatePresence>
        {userSearchQuery.length >= 2 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border shrink-0"
          >
            <div className="p-2 pt-1 space-y-0.5 max-h-48 overflow-y-auto scrollbar-thin">
              {searchingUsers && (
                <p className="text-xs text-muted-foreground text-center py-3">Searching...</p>
              )}
              {!searchingUsers && userResults.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">No users found</p>
              )}
              {userResults.map((profile) => (
                <div
                  key={profile.id}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-all group"
                >
                  <button
                    onClick={() => onProfileClick?.(profile.user_id)}
                    className="relative shrink-0"
                  >
                    <UserAvatar url={profile.avatar_url} name={profile.display_name} className="w-8 h-8 ring-0" />
                    {isOnline(profile.user_id) && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-accent rounded-full border-2 border-background" />
                    )}
                  </button>
                  <button
                    onClick={() => onProfileClick?.(profile.user_id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <span className="text-sm font-medium truncate block">{profile.display_name || 'User'}</span>
                    <span className="text-[10px] text-muted-foreground">{isOnline(profile.user_id) ? 'Online' : 'Offline'}</span>
                  </button>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        onStartConversation(profile.user_id);
                        setUserSearchQuery('');
                        setUserResults([]);
                      }}
                    >
                      Chat
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friend request badge */}
      {friendRequestCount !== undefined && friendRequestCount > 0 && (
        <div className="px-3 py-2 shrink-0">
          <button
            onClick={onFriendRequestsClick}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-sm font-medium text-primary hover:bg-primary/15 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Friend Requests</span>
            <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {friendRequestCount}
            </span>
          </button>
        </div>
      )}

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-secondary shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-secondary rounded w-24" />
                  <div className="h-2 bg-secondary rounded w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
            <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No conversations</p>
            <p className="text-xs mt-1">Search for users above to start</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredConversations.map((conv) => {
              const otherUserId = conv.other_user?.user_id;
              const online = otherUserId ? isOnline(otherUserId) : false;
              const isGroup = conv.is_group;

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left',
                    activeConversation === conv.id
                      ? 'bg-primary/10 shadow-sm'
                      : 'hover:bg-accent/50'
                  )}
                >
                  <div className="relative shrink-0">
                    {isGroup ? (
                      <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                    ) : (
                      <UserAvatar url={conv.other_user?.avatar_url} name={conv.other_user?.display_name} className="w-11 h-11 ring-0" />
                    )}
                    {!isGroup && online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full border-[2.5px] border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate flex items-center gap-1.5">
                        {isGroup ? (conv.group_name || 'Group') : (conv.other_user?.display_name || 'User')}
                        {isGroup && (
                          <span className="text-[9px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded-full shrink-0">
                            group
                          </span>
                        )}
                      </span>
                      {conv.last_message && (
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                          {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                        {conv.last_message?.content
                          ? (conv.last_message.message_type === 'image' ? 'Photo' : conv.last_message.content)
                          : 'No messages yet'}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className={cn(
                          'ml-2 text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shrink-0',
                          markingRead?.has(conv.id)
                            ? 'bg-muted text-muted-foreground/50'
                            : staleUnread
                              ? 'bg-muted text-muted-foreground border border-dashed border-muted-foreground/30'
                              : 'bg-primary text-primary-foreground'
                        )}>
                          {staleUnread ? '?' : conv.unread_count > 99 ? '99+' : conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <GroupCreateDialog
        isOpen={showGroupCreate}
        onClose={() => setShowGroupCreate(false)}
        onCreated={(convId) => {
          onSelect(convId);
          if (onGroupCreated) onGroupCreated(convId);
        }}
      />
    </div>
  );
}

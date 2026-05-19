import { useState } from 'react';
import { Search, Plus, MessageSquare, Users, UserPlus, UserCheck } from 'lucide-react';
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
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showGroupCreate, setShowGroupCreate] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const results = await searchUsers(query);
    setSearchResults(results);
    setIsSearching(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={showSearch ? "Search users..." : "Search conversations..."}
              value={searchQuery}
              onChange={(e) => showSearch ? handleSearch(e.target.value) : setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary/50 border-border/50 h-9 text-sm"
            />
          </div>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant={showSearch ? "default" : "ghost"}
              className="shrink-0 h-9 w-9 relative"
              onClick={() => {
                setShowSearch(!showSearch);
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <UserPlus className="w-4 h-4" />
            </Button>
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
        </div>
      </div>

      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border"
          >
            <div className="p-3 pt-0 space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
              {isSearching && (
                <p className="text-xs text-muted-foreground text-center py-2">Searching...</p>
              )}
              {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No users found</p>
              )}
              {searchQuery.length < 2 && (
                <p className="text-xs text-muted-foreground text-center py-2">Type at least 2 characters to search</p>
              )}
              {searchResults.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => {
                    onStartConversation(profile.user_id);
                    setShowSearch(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all text-left group"
                >
                  <div className="relative">
                    <UserAvatar
                      url={profile.avatar_url}
                      name={profile.display_name}
                      className="w-9 h-9 ring-0"
                    />
                    {isOnline(profile.user_id) && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{profile.display_name || 'User'}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {isOnline(profile.user_id) ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    Chat →
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friend request badge */}
      {friendRequestCount !== undefined && friendRequestCount > 0 && (
        <div className="px-3 pb-2">
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-sm font-medium text-primary hover:bg-primary/15 transition-colors">
            <UserCheck className="w-4 h-4" />
            <span>Friend Requests</span>
            <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {friendRequestCount}
            </span>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-secondary rounded w-24" />
                  <div className="h-2 bg-secondary rounded w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
            <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No conversations yet</p>
            <p className="text-xs mt-1">Tap + to find users and start chatting</p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {conversations
              .filter(c => {
                if (!searchQuery || showSearch) return true;
                const name = c.is_group ? c.group_name : c.other_user?.display_name;
                return name?.toLowerCase().includes(searchQuery.toLowerCase());
              })
              .map((conv) => {
                const otherUserId = conv.other_user?.user_id;
                const online = otherUserId ? isOnline(otherUserId) : false;
                const isGroup = conv.is_group;

                return (
                  <button
                    key={conv.id}
                    onClick={() => onSelect(conv.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left',
                      activeConversation === conv.id
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-secondary/50'
                    )}
                  >
                    <div className="relative shrink-0">
                      {isGroup ? (
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                      ) : (
                        <UserAvatar
                          url={conv.other_user?.avatar_url}
                          name={conv.other_user?.display_name}
                          className="w-10 h-10 ring-0"
                        />
                      )}
                      {!isGroup && online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-accent rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate flex items-center gap-1.5">
                          {isGroup
                            ? (conv.group_name || 'Group')
                            : (conv.other_user?.display_name || 'User')}
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
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {conv.last_message?.content
                            ? (conv.last_message.message_type === 'image' ? '📷 Image' : conv.last_message.content)
                            : 'No messages yet'}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="ml-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                            {conv.unread_count}
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

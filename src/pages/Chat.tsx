import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useChat, Profile, Message } from '@/hooks/useChat';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
import { useFriends } from '@/hooks/useFriends';
import { usePresenceContext } from '@/contexts/PresenceContext';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { UserProfileDialog } from '@/components/profile/UserProfileDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { ArrowLeft, MessageCircle, Search, UserCheck, UserPlus, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationsContext } from '@/contexts/NotificationsContext';
import { useChatUnreadCount } from '@/contexts/ChatUnreadContext';
import { toast } from 'sonner';

let faviconOriginalHref: string | null = null;

function updateFaviconBadge(count: number) {
  const existing = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!existing) return;
  // Pin the pristine icon on first run: redrawing from the already-badged
  // data URL compounds badges on every unread change.
  if (faviconOriginalHref === null) {
    faviconOriginalHref = existing.href;
  }
  const sourceHref = faviconOriginalHref;
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.drawImage(img, 0, 0, 32, 32);
    if (count > 0) {
      const text = count > 99 ? '99+' : String(count);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(26, 6, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 26, 7);
    }
    existing.href = canvas.toDataURL();
  };
  img.src = sourceHref;
}

type Tab = 'chats' | 'friends';

const Chat = () => {
  const { user } = useAuth();
  const chat = useChat();
  const friends = useFriends();
  const presence = usePresenceContext();
  const isMobile = useIsMobile();
  const [showSidebar, setShowSidebar] = useState(true);
  const [tab, setTab] = useState<Tab>('chats');
  const [addFriendQuery, setAddFriendQuery] = useState('');
  const [addFriendResults, setAddFriendResults] = useState<Profile[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [profileTarget, setProfileTarget] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const { markReadByKind } = useNotificationsContext();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [searchParams] = useSearchParams();

  // Handle URL params from notification bar navigation.
  // Re-runs when the query string changes so taps while already on /chat
  // switch conversations instead of being swallowed by the one-shot effect.
  useEffect(() => {
    const convParam = searchParams.get('conversation');
    const tabParam = searchParams.get('tab');
    if (convParam) {
      chat.openConversation(convParam);
      if (isMobile) setShowSidebar(false);
    }
    if (tabParam === 'friends') {
      setTab('friends');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const { setStaleUnread } = useChatUnreadCount();

  useEffect(() => {
    setStaleUnread(chat.staleUnread);
  }, [chat.staleUnread, setStaleUnread]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleRealtimeMessage = useCallback((message: Message) => {
    chat.pushMessage(message);
  }, [chat.pushMessage]);

  useRealtimeChat({
    conversationId: chat.activeConversation,
    currentUserId: user?.id ?? null,
    onNewMessage: handleRealtimeMessage,
  });

  // Sync active conversation to presence context for typing indicators
  useEffect(() => {
    presence.setActiveConversation(chat.activeConversation);
  }, [chat.activeConversation, presence]);
  useEffect(() => {
    markReadByKind('chat_message');
  }, [chat.activeConversation, markReadByKind]);

  // Mark friend request notifications as read when on friends tab
  useEffect(() => {
    if (tab === 'friends') {
      markReadByKind('friend_request');
    }
  }, [tab, markReadByKind]);

  // Update document title and favicon with total unread count
  const totalUnread = chat.totalUnreadCount;
  useEffect(() => {
    const title = totalUnread > 0 ? `[${totalUnread > 99 ? '99+' : totalUnread}] JUPEB Study Guide` : 'JUPEB Study Guide';
    document.title = title;
    updateFaviconBadge(totalUnread);
  }, [totalUnread]);

  useEffect(() => {
    if (addFriendQuery.trim().length < 2) { setAddFriendResults([]); return; }
    setSearchingUsers(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await chat.searchUsers(addFriendQuery);
      setAddFriendResults(results);
      setSearchingUsers(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [addFriendQuery, chat.searchUsers]);

  const groupCount = chat.conversations.filter(c => c.is_group).length;

  const handleSelectConversation = (id: string) => {
    chat.openConversation(id);
    if (isMobile) setShowSidebar(false);
  };

  const handleStartConversation = async (userId: string) => {
    try {
      const convId = await chat.startConversation(userId);
      if (convId && isMobile) setShowSidebar(false);
    } catch (err) {
      toast.error(String(err));
    }
  };

  const handleBackToSidebar = () => {
    chat.setActiveConversation(null);
    setShowSidebar(true);
  };

  const openProfile = (userId: string) => {
    setProfileTarget(userId);
    setShowProfile(true);
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      {(!isMobile || showSidebar) && (
        <div className={`${isMobile ? 'w-full' : 'w-80 border-r border-border/40'} flex flex-col bg-gradient-to-b from-background via-background to-secondary/10`}>
          {/* Header */}
          <div className="relative p-3 border-b border-border/40">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <div className="flex items-center gap-2">
              <Link to="/">
                <Button variant="ghost" size="icon" className="shrink-0 rounded-xl hover:bg-accent/50">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="font-bold text-base">Messages</h1>
                <p className="text-[10px] text-muted-foreground/60 -mt-0.5">Chat with friends</p>
              </div>
              <div className="ml-auto flex gap-1">
                <Link to="/settings/profile">
                  <Button variant="ghost" size="icon" className="shrink-0 rounded-xl hover:bg-accent/50">
                    <Settings className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex gap-1 mt-2">
              <Button
                variant={tab === 'chats' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 text-xs rounded-lg flex-1"
                onClick={() => setTab('chats')}
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                Chats
              </Button>
              <Button
                variant={tab === 'friends' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 text-xs rounded-lg flex-1 relative"
                onClick={() => setTab('friends')}
              >
                <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                Friends
                {friends.incomingRequests.length > 0 && (
                  <span className="ml-1 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                    {friends.incomingRequests.length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {tab === 'chats' ? (
            <ChatSidebar
              conversations={chat.conversations}
              activeConversation={chat.activeConversation}
              loading={chat.loading}
              onSelect={handleSelectConversation}
              onStartConversation={handleStartConversation}
              searchUsers={chat.searchUsers}
              isOnline={presence.isOnline}
              isTyping={presence.isTyping}
              getLastSeen={presence.getLastSeen}
              friendRequestCount={friends.incomingRequests.length}
              onGroupCreated={(convId) => handleSelectConversation(convId)}
              onFriendRequestsClick={() => setTab('friends')}
              onProfileClick={openProfile}
              onDelete={chat.deleteConversation}
              markingRead={chat.markingRead}
              staleUnread={chat.staleUnread}
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
              {/* Add friend search */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Social
                  </h3>
                  <div className="flex gap-3 text-[11px] text-muted-foreground">
                    <span><strong className="text-foreground">{friends.friends.length}</strong> friends</span>
                    <span><strong className="text-foreground">{groupCount}</strong> groups</span>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Find people to add..."
                    value={addFriendQuery}
                    onChange={(e) => setAddFriendQuery(e.target.value)}
                    className="pl-8 bg-secondary/30 border-border/30 h-9 text-xs"
                  />
                </div>
                {addFriendQuery.length >= 2 && (
                  <div className="mt-1 space-y-0.5 max-h-40 overflow-y-auto scrollbar-thin">
                    {searchingUsers && (
                      <p className="text-xs text-muted-foreground text-center py-3">Searching...</p>
                    )}
                    {!searchingUsers && addFriendResults.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">No users found</p>
                    )}
                    {addFriendResults.map((profile) => {
                      const isAlreadyFriend = friends.friends.some(f => f.user_id === profile.user_id);
                      const hasPendingOutgoing = friends.outgoingRequests.some(r => r.receiver_id === profile.user_id);
                      const hasIncomingRequest = friends.incomingRequests.some(r => r.sender_id === profile.user_id);
                      return (
                        <div key={profile.user_id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/30 transition-all">
                          <button onClick={() => openProfile(profile.user_id)}>
                            <UserAvatar url={profile.avatar_url} name={profile.display_name} className="w-8 h-8 ring-0" targetUserId={profile.user_id} />
                          </button>
                          <button
                            onClick={() => openProfile(profile.user_id)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <p className="text-sm font-medium truncate">{profile.display_name || 'User'}</p>
                          </button>
                          {isAlreadyFriend ? (
                            <span className="text-[10px] text-muted-foreground">Friends</span>
                          ) : hasIncomingRequest ? (
                            <span className="text-[10px] text-accent">Respond</span>
                          ) : hasPendingOutgoing ? (
                            <span className="text-[10px] text-muted-foreground">Pending</span>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 text-xs rounded-lg"
                              onClick={async () => {
                                const { error } = await friends.sendRequest(profile.user_id);
                                if (error) toast.error(error.message);
                              }}
                            >
                              <UserPlus className="w-3 h-3 mr-1" />
                              Add
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Incoming requests */}
              {friends.incomingRequests.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    Incoming Requests
                  </h3>
                  {friends.incomingRequests.map((req) => (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/10 mb-1"
                    >
                      <button onClick={() => openProfile(req.sender_id)}>
                        <UserAvatar
                          url={req.sender?.avatar_url}
                          name={req.sender?.display_name}
                          className="w-10 h-10 ring-2 ring-primary/20"
                          targetUserId={req.sender_id}
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => openProfile(req.sender_id)}
                          className="text-left"
                        >
                          <p className="text-sm font-medium truncate">{req.sender?.display_name || 'User'}</p>
                        </button>
                        <p className="text-[10px] text-muted-foreground">Wants to connect</p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="h-8 text-xs rounded-lg bg-gradient-to-r from-primary to-accent hover:opacity-90"
                          onClick={async () => {
                            const { error } = await friends.respondToRequest(req.id, true);
                            if (error) toast.error(error.message);
                          }}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs rounded-lg"
                          onClick={async () => {
                            const { error } = await friends.respondToRequest(req.id, false);
                            if (error) toast.error(error.message);
                          }}
                        >
                          Decline
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* All friends */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  Friends ({friends.friends.length})
                </h3>
                {friends.friends.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mx-auto mb-3">
                      <UserCheck className="w-7 h-7 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No friends yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Search above to find people and send requests</p>
                  </motion.div>
                ) : (
                  <div className="space-y-1">
                    {friends.friends.map((f) => (
                      <motion.div
                        key={f.user_id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/30 transition-all cursor-pointer group"
                        onClick={() => handleStartConversation(f.user_id)}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); openProfile(f.user_id); }}
                          className="relative shrink-0"
                        >
                          <UserAvatar
                            url={f.avatar_url}
                            name={f.display_name}
                            className="w-10 h-10 ring-2 ring-border/40 group-hover:ring-primary/30 transition-all"
                            targetUserId={f.user_id}
                          />
                          {presence.isOnline(f.user_id) && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[2.5px] border-background" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{f.display_name || 'User'}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              presence.isOnline(f.user_id) ? "bg-emerald-500" : "bg-muted-foreground/30"
                            )} />
                            {presence.isOnline(f.user_id) ? 'Online' : 'Offline'}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 text-xs rounded-lg shrink-0"
                            onClick={(e) => { e.stopPropagation(); handleStartConversation(f.user_id); }}
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1" />
                            Chat
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Outgoing requests */}
              {friends.outgoingRequests.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    Sent Requests ({friends.outgoingRequests.length})
                  </h3>
                  {friends.outgoingRequests.map((req) => (
                    <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 border border-border/40 mb-1">
                      <button onClick={() => openProfile(req.receiver_id)}>
                        <UserAvatar
                          url={req.receiver?.avatar_url}
                          name={req.receiver?.display_name}
                          className="w-10 h-10 ring-2 ring-border/20"
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <button onClick={() => openProfile(req.receiver_id)} className="text-left">
                          <p className="text-sm font-medium truncate">{req.receiver?.display_name || 'User'}</p>
                        </button>
                        <p className="text-[10px] text-muted-foreground">Request sent</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs rounded-lg"
                        onClick={async () => {
                          await friends.cancelRequest(req.id);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Chat area */}
      {(!isMobile || !showSidebar) && (
        <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-background via-background to-secondary/5">
          <ChatArea
            messages={chat.messages}
            activeConversation={chat.activeConversation}
            conversations={chat.conversations}
            loading={chat.messagesLoading}
            onSend={chat.sendMessage}
            onSendImage={chat.sendImage}
            onSendFile={chat.sendFile}
            onReact={chat.sendReaction}
            onForward={chat.forwardMessage}
            onEditMessage={chat.editMessage}
            onDeleteMessage={chat.deleteMessage}
            onPushMessage={chat.pushMessage}
            onUploadImage={chat.uploadImage}
            onUploadFile={chat.uploadFile}
            onBack={isMobile ? handleBackToSidebar : undefined}
            isOnline={presence.isOnline}
            isTyping={presence.isTyping}
            isRecordingVn={presence.isRecordingVn}
            getLastSeen={presence.getLastSeen}
            onTyping={presence.setTyping}
            onRecordingVn={presence.setRecordingVn}
            hasMoreMessages={chat.hasMoreMessages}
            loadingMore={chat.loadingMore}
            onLoadMore={chat.loadMoreMessages}
            onProfileClick={openProfile}
            onBroadcastMessage={chat.broadcastMessage}
            onQueueVoiceNote={chat.queueVoiceNote}
            onDeleteForMe={chat.hideMessage}
            pendingCount={chat.pendingCount}
            onFlushOfflineQueue={chat.flushOfflineQueue}
            onStartDm={handleStartConversation}
          />
        </div>
      )}

      </div>

      {/* Profile dialog */}
      <UserProfileDialog
        userId={profileTarget}
        open={showProfile}
        onClose={() => { setShowProfile(false); setProfileTarget(null); }}
        onStartChat={handleStartConversation}
      />

    </div>
  );
};

export default Chat;

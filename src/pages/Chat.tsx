import { useState } from 'react';
import { motion } from 'framer-motion';
import { useChat } from '@/hooks/useChat';
import { useFriends } from '@/hooks/useFriends';
import { usePresence } from '@/hooks/usePresence';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { useIsMobile } from '@/hooks/use-mobile';
import { ArrowLeft, MessageCircle, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type Tab = 'chats' | 'friends';

const Chat = () => {
  const { user } = useAuth();
  const chat = useChat();
  const friends = useFriends();
  const presence = usePresence(chat.activeConversation);
  const isMobile = useIsMobile();
  const [showSidebar, setShowSidebar] = useState(true);
  const [tab, setTab] = useState<Tab>('chats');

  const handleSelectConversation = (id: string) => {
    chat.openConversation(id);
    if (isMobile) setShowSidebar(false);
  };

  const handleStartConversation = async (userId: string) => {
    try {
      const convId = await chat.startConversation(userId);
      if (!convId) {
        toast.error('Could not create conversation');
        return;
      }
      if (isMobile) setShowSidebar(false);
    } catch (err) {
      console.error('Start conversation error:', err);
      toast.error('Failed to start conversation');
    }
  };

  const handleBackToSidebar = () => {
    chat.setActiveConversation(null);
    setShowSidebar(true);
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-background via-background to-secondary/20">
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
                <Button
                  variant={tab === 'chats' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 text-xs rounded-lg"
                  onClick={() => setTab('chats')}
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                  Chats
                </Button>
                <Button
                  variant={tab === 'friends' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 text-xs rounded-lg relative"
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
              friendRequestCount={friends.incomingRequests.length}
              onGroupCreated={(convId) => handleSelectConversation(convId)}
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
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
                      <UserAvatar
                        url={req.sender?.avatar_url}
                        name={req.sender?.display_name}
                        className="w-10 h-10 ring-2 ring-primary/20"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{req.sender?.display_name || 'User'}</p>
                        <p className="text-[10px] text-muted-foreground">Wants to connect</p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="h-8 text-xs rounded-lg bg-gradient-to-r from-primary to-accent hover:opacity-90"
                          onClick={async () => {
                            await friends.respondToRequest(req.id, true);
                          }}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs rounded-lg"
                          onClick={async () => {
                            await friends.respondToRequest(req.id, false);
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
                    <p className="text-xs text-muted-foreground/60 mt-1">Search for users above to start</p>
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
                        <div className="relative shrink-0">
                          <UserAvatar
                            url={f.avatar_url}
                            name={f.display_name}
                            className="w-10 h-10 ring-2 ring-border/40 group-hover:ring-primary/30 transition-all"
                          />
                          {presence.isOnline(f.user_id) && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[2.5px] border-background" />
                          )}
                        </div>
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
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          onClick={(e) => { e.stopPropagation(); handleStartConversation(f.user_id); }}
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1" />
                          Chat
                        </Button>
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
                      <UserAvatar
                        url={req.receiver?.avatar_url}
                        name={req.receiver?.display_name}
                        className="w-10 h-10 ring-2 ring-border/20"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{req.receiver?.display_name || 'User'}</p>
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
            onReact={chat.sendReaction}
            onUploadImage={chat.uploadImage}
            onBack={isMobile ? handleBackToSidebar : undefined}
            isOnline={presence.isOnline}
            isTyping={presence.isTyping}
            onTyping={presence.setTyping}
          />
        </div>
      )}
    </div>
  );
};

export default Chat;

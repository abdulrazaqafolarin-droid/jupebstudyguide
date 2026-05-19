import { useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { useFriends } from '@/hooks/useFriends';
import { usePresence } from '@/hooks/usePresence';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { useIsMobile } from '@/hooks/use-mobile';
import { ArrowLeft, MessageCircle, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
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
    } catch {
      toast.error('Failed to start conversation');
    }
  };

  const handleBackToSidebar = () => {
    chat.setActiveConversation(null);
    setShowSidebar(true);
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      {(!isMobile || showSidebar) && (
        <div className={`${isMobile ? 'w-full' : 'w-80 border-r border-border'} flex flex-col`}>
          {/* Header */}
          <div className="p-3 border-b border-border flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="font-semibold text-lg">Messages</h1>
            <div className="ml-auto flex gap-1">
              <Button
                variant={tab === 'chats' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setTab('chats')}
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                Chats
              </Button>
              <Button
                variant={tab === 'friends' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 text-xs relative"
                onClick={() => setTab('friends')}
              >
                <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                Friends
                {friends.incomingRequests.length > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5">
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
                    <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 mb-1">
                      <UserAvatar
                        url={req.sender?.avatar_url}
                        name={req.sender?.display_name}
                        className="w-10 h-10 ring-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{req.sender?.display_name || 'User'}</p>
                        <p className="text-[10px] text-muted-foreground">Wants to connect</p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          onClick={async () => {
                            await friends.respondToRequest(req.id, true);
                          }}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={async () => {
                            await friends.respondToRequest(req.id, false);
                          }}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* All friends */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  Friends ({friends.friends.length})
                </h3>
                {friends.friends.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No friends yet</p>
                    <p className="text-xs mt-1">Search for users and send friend requests</p>
                  </div>
                ) : (
                  friends.friends.map((f) => (
                    <button
                      key={f.user_id}
                      onClick={() => {
                        handleStartConversation(f.user_id);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors text-left group"
                    >
                      <div className="relative">
                        <UserAvatar
                          url={f.avatar_url}
                          name={f.display_name}
                          className="w-10 h-10 ring-0"
                        />
                        {presence.isOnline(f.user_id) && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.display_name || 'User'}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {presence.isOnline(f.user_id) ? 'Online' : 'Offline'}
                        </p>
                      </div>
                      <span className="text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        Message →
                      </span>
                    </button>
                  ))
                )}
              </div>

              {/* Outgoing requests */}
              {friends.outgoingRequests.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    Sent Requests ({friends.outgoingRequests.length})
                  </h3>
                  {friends.outgoingRequests.map((req) => (
                    <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 mb-1">
                      <UserAvatar
                        url={req.receiver?.avatar_url}
                        name={req.receiver?.display_name}
                        className="w-10 h-10 ring-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{req.receiver?.display_name || 'User'}</p>
                        <p className="text-[10px] text-muted-foreground">Request sent</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
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
        <div className="flex-1 flex flex-col min-w-0">
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

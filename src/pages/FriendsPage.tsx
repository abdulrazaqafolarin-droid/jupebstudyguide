import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Search, UserCheck, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "@/hooks/useFriends";
import { useChat, Profile } from "@/hooks/useChat";
import { usePresenceContext } from "@/contexts/PresenceContext";
import { useNotificationsContext } from "@/contexts/NotificationsContext";
import { UserProfileDialog } from "@/components/profile/UserProfileDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function FriendsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const friends = useFriends();
  const chat = useChat();
  const { isOnline } = usePresenceContext();
  const { markReadByKind } = useNotificationsContext();

  const [addFriendQuery, setAddFriendQuery] = useState("");
  const [addFriendResults, setAddFriendResults] = useState<Profile[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [profileTarget, setProfileTarget] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    markReadByKind("friend_request");
  }, [markReadByKind]);

  useEffect(() => {
    if (addFriendQuery.trim().length < 2) {
      setAddFriendResults([]);
      return;
    }
    setSearchingUsers(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await chat.searchUsers(addFriendQuery);
      setAddFriendResults(results);
      setSearchingUsers(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [addFriendQuery, chat]);

  const handleStartConversation = async (userId: string) => {
    try {
      const convId = await chat.startConversation(userId);
      navigate(convId ? `/chat?conversation=${convId}` : "/chat");
    } catch (err) {
      toast.error(String(err));
    }
  };

  const openProfile = (userId: string) => {
    setProfileTarget(userId);
    setShowProfile(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <header className="sticky top-0 z-10 bg-gradient-to-b from-background/95 to-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors rounded-xl px-2 py-1.5 hover:bg-accent/50"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-sm font-bold">Friends</h1>
            <p className="text-[10px] text-muted-foreground/60 -mt-0.5">
              <strong className="text-foreground">{friends.friends.length}</strong> friends
            </p>
          </div>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Add friend search */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Add Friends
          </h3>
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
                const isAlreadyFriend = friends.friends.some((f) => f.user_id === profile.user_id);
                const hasPendingOutgoing = friends.outgoingRequests.some((r) => r.receiver_id === profile.user_id);
                const hasIncomingRequest = friends.incomingRequests.some((r) => r.sender_id === profile.user_id);
                return (
                  <div key={profile.user_id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/30 transition-all">
                    <button onClick={() => openProfile(profile.user_id)}>
                      <UserAvatar url={profile.avatar_url} name={profile.display_name} className="w-8 h-8 ring-0" targetUserId={profile.user_id} />
                    </button>
                    <button
                      onClick={() => openProfile(profile.user_id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-sm font-medium truncate">{profile.display_name || "User"}</p>
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
                  <button onClick={() => openProfile(req.sender_id)} className="text-left">
                    <p className="text-sm font-medium truncate">{req.sender?.display_name || "User"}</p>
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

        {/* Outgoing requests */}
        {friends.outgoingRequests.length > 0 && (
          <div>
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
                    targetUserId={req.receiver_id}
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => openProfile(req.receiver_id)} className="text-left">
                    <p className="text-sm font-medium truncate">{req.receiver?.display_name || "User"}</p>
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

        {/* Friends list */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            All Friends ({friends.friends.length})
          </h3>
          {friends.friends.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No friends yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Search above to find people and send requests
              </p>
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
                    onClick={(e) => {
                      e.stopPropagation();
                      openProfile(f.user_id);
                    }}
                    className="relative shrink-0"
                  >
                    <UserAvatar
                      url={f.avatar_url}
                      name={f.display_name}
                      className="w-10 h-10 ring-2 ring-border/40 group-hover:ring-primary/30 transition-all"
                      targetUserId={f.user_id}
                    />
                    {isOnline(f.user_id) && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[2.5px] border-background" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.display_name || "User"}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isOnline(f.user_id) ? "bg-emerald-500" : "bg-muted-foreground/30",
                        )}
                      />
                      {isOnline(f.user_id) ? "Online" : "Offline"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs rounded-lg shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartConversation(f.user_id);
                      }}
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
      </main>

      <UserProfileDialog
        userId={profileTarget}
        open={showProfile}
        onClose={() => {
          setShowProfile(false);
          setProfileTarget(null);
        }}
        onStartChat={handleStartConversation}
      />
    </div>
  );
}

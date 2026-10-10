import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, UserPlus, UserCheck, UserX, Ban, Loader2, ShieldAlert, Clock, Send, Trophy, Star, Eye, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useMutualFriends } from '@/hooks/useMutualFriends';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ACHIEVEMENTS } from '@/hooks/useAchievements';
import AchievementBadge from '@/components/AchievementBadge';
import UserAchievementPreview from '@/components/UserAchievementPreview';
import { ReportUserDialog } from '@/components/profile/ReportUserDialog';

export interface UserProfileData {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  privacy_avatar: string;
  privacy_profile: string;
}

type RelationshipStatus = 'stranger' | 'pending_sent' | 'pending_receipt' | 'accepted' | 'blocked';

interface UserProfileDialogProps {
  userId: string | null;
  open: boolean;
  onClose: () => void;
  onStartChat?: (userId: string) => void;
}

export function UserProfileDialog({ userId, open, onClose, onStartChat }: UserProfileDialogProps) {
  const { user } = useAuth();
  const { mutualFriends, getMutualFriends } = useMutualFriends();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [relationship, setRelationship] = useState<RelationshipStatus>('stranger');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [otherAchievements, setOtherAchievements] = useState<string[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const fetchGenRef = useRef(0);

  const fetchProfile = useCallback(async () => {
    if (!userId || !user) return;
    const gen = ++fetchGenRef.current;
    setLoading(true);

    const [profileRes, relationRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, bio, privacy_avatar, privacy_profile, achievements')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase.rpc('get_relationship_status', {
        user_a: user.id,
        user_b: userId,
      }),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data as UserProfileData);
      const rawAchievements = (profileRes.data as Record<string, unknown>).achievements;
      setOtherAchievements(Array.isArray(rawAchievements) ? rawAchievements : []);
    }

    // Check blocked
    const { data: blockCheck } = await supabase
      .from('friend_requests')
      .select('status')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
      .eq('status', 'blocked')
      .maybeSingle();

    if (blockCheck) {
      setRelationship('blocked');
    } else {
      setRelationship((relationRes.data as RelationshipStatus) || 'stranger');
    }

    if (profileRes.data) {
      await getMutualFriends(userId);
    }

    if (gen !== fetchGenRef.current) return;
    setLoading(false);
  }, [userId, user, getMutualFriends]);

  useEffect(() => {
    if (open && userId) {
      fetchProfile();
      setMutualFriendsList([]);
    }
  }, [open, userId]);

  const [mutualFriendsList, setMutualFriendsList] = useState<Array<{ friend_id: string; display_name: string | null; avatar_url: string | null }>>([]);
  useEffect(() => {
    if (mutualFriends.length > 0) {
      setMutualFriendsList(mutualFriends.slice(0, 5));
    }
  }, [mutualFriends]);

  const handleSendRequest = async () => {
    if (!userId) return;
    setActionLoading(true);
    const { data, error } = await supabase.rpc('send_friend_request', {
      receiver_id: userId,
    });
    if (error) {
      toast.error(error.message);
    } else {
      const result = data as unknown as { success?: boolean; error?: string };
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Friend request sent!');
        setRelationship('pending_sent');
      }
    }
    setActionLoading(false);
  };

  const handleCancelRequest = async () => {
    if (!userId || !user) return;
    setActionLoading(true);
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('sender_id', user.id)
      .eq('receiver_id', userId)
      .eq('status', 'pending');
    if (!error) {
      setRelationship('stranger');
      toast.success('Request cancelled');
    }
    setActionLoading(false);
  };

  const handleAcceptRequest = async () => {
    if (!userId || !user) return;
    setActionLoading(true);
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('sender_id', userId)
      .eq('receiver_id', user.id)
      .eq('status', 'pending');
    if (!error) {
      setRelationship('accepted');
      toast.success('Friend request accepted!');
    }
    setActionLoading(false);
  };

  const handleDeclineRequest = async () => {
    if (!userId || !user) return;
    setActionLoading(true);
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected' })
      .eq('sender_id', userId)
      .eq('receiver_id', user.id)
      .eq('status', 'pending');
    if (!error) {
      setRelationship('stranger');
      toast.success('Request declined');
    }
    setActionLoading(false);
  };

  const handleUnfriend = async () => {
    if (!userId || !user) return;
    setActionLoading(true);
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
      .eq('status', 'accepted');
    if (!error) {
      setRelationship('stranger');
      toast.success('Unfriended');
    }
    setActionLoading(false);
  };

  const handleBlock = async () => {
    if (!userId) return;
    setActionLoading(true);
    await supabase.rpc('block_user', { p_blocked_id: userId });
    setRelationship('blocked');
    toast.success('User blocked');
    setActionLoading(false);
  };

  const handleUnblock = async () => {
    if (!userId) return;
    setActionLoading(true);
    await supabase.rpc('unblock_user', { p_blocked_id: userId });
    setRelationship('stranger');
    toast.success('User unblocked');
    setActionLoading(false);
  };

  const unlockedAchievementList = useMemo(() => {
    const ids = new Set(otherAchievements);
    return ACHIEVEMENTS.filter(a => ids.has(a.id));
  }, [otherAchievements]);

  const isOwnProfile = userId === user?.id;

  const renderActions = () => {
    if (isOwnProfile || !userId) return null;

    const actionButton = (label: string, icon: typeof MessageCircle, onClick: () => void, variant: 'default' | 'outline' | 'destructive' = 'default') => (
      <Button
        size="sm"
        variant={variant}
        onClick={onClick}
        disabled={actionLoading}
        className="flex-1 h-9 text-xs rounded-lg"
      >
        {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
        {React.createElement(icon, { className: 'w-3.5 h-3.5 mr-1.5' })}
        {label}
      </Button>
    );

    const reportBtn = (
      <Button
        key="report"
        size="sm"
        variant="ghost"
        onClick={() => setShowReport(true)}
        className="h-9 w-9 rounded-lg"
        title="Report user"
      >
        <Flag className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
      </Button>
    );

    const buttons: React.ReactNode[] = [];

    switch (relationship) {
      case 'stranger':
        buttons.push(actionButton('Send Message', MessageCircle, () => onStartChat?.(userId!)));
        buttons.push(actionButton('Add Friend', UserPlus, handleSendRequest));
        buttons.push(reportBtn);
        buttons.push(
          <Button
            key="block"
            size="sm"
            variant="ghost"
            onClick={handleBlock}
            disabled={actionLoading}
            className="h-9 w-9 rounded-lg"
            title="Block user"
          >
            <Ban className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
          </Button>
        );
        break;
      case 'pending_sent':
        buttons.push(actionButton('Send Message', MessageCircle, () => onStartChat?.(userId!)));
        buttons.push(actionButton('Cancel Request', Clock, handleCancelRequest, 'outline'));
        buttons.push(reportBtn);
        buttons.push(
          <Button
            key="block"
            size="sm"
            variant="ghost"
            onClick={handleBlock}
            disabled={actionLoading}
            className="h-9 w-9 rounded-lg"
            title="Block user"
          >
            <Ban className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
          </Button>
        );
        break;
      case 'pending_receipt':
        buttons.push(actionButton('Send Message', MessageCircle, () => onStartChat?.(userId!)));
        buttons.push(actionButton('Accept', UserCheck, handleAcceptRequest));
        buttons.push(actionButton('Decline', UserX, handleDeclineRequest, 'destructive'));
        buttons.push(reportBtn);
        buttons.push(
          <Button
            key="block"
            size="sm"
            variant="ghost"
            onClick={handleBlock}
            disabled={actionLoading}
            className="h-9 w-9 rounded-lg"
            title="Block user"
          >
            <Ban className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
          </Button>
        );
        break;
      case 'accepted':
        buttons.push(actionButton('Send Message', Send, () => onStartChat?.(userId!)));
        buttons.push(actionButton('Unfriend', UserX, handleUnfriend, 'destructive'));
        buttons.push(reportBtn);
        buttons.push(
          <Button
            key="block"
            size="sm"
            variant="ghost"
            onClick={handleBlock}
            disabled={actionLoading}
            className="h-9 w-9 rounded-lg"
            title="Block user"
          >
            <Ban className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
          </Button>
        );
        break;
      case 'blocked':
        buttons.push(actionButton('Unblock', Ban, handleUnblock));
        break;
    }

    return <div className="flex items-center gap-2 flex-wrap">{buttons}</div>;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl border shadow-xl w-full max-w-sm overflow-hidden"
          >
            {/* Header */}
            <div className="relative h-24 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/5">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 hover:bg-black/30 transition-colors z-10"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Avatar */}
            <div className="relative -mt-12 flex justify-center px-4">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-full blur-xl opacity-60" />
              <UserAvatar
                url={profile?.avatar_url}
                name={profile?.display_name}
                className="w-24 h-24 ring-4 ring-background relative"
                viewable
                targetUserId={profile?.user_id}
              />
            </div>

            {/* Content */}
            <div className="px-5 pb-5 pt-3 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : profile ? (
                <>
                  {/* Name + Username */}
                  <div className="text-center">
                    <h2 className="text-lg font-bold">{profile.display_name || 'User'}</h2>
                    <p className="text-xs text-muted-foreground">@{profile.user_id.slice(0, 8)}</p>
                  </div>

                  {/* Bio */}
                  {profile.bio && (
                    <p className="text-sm text-muted-foreground text-center leading-relaxed px-2">
                      {profile.bio}
                    </p>
                  )}

                  {/* Mutual Friends */}
                  {mutualFriendsList.length > 0 && (
                    <div className="bg-secondary/30 rounded-xl p-3 border border-border/40">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex -space-x-2">
                          {mutualFriendsList.slice(0, 3).map((f) => (
                            <UserAvatar
                              key={f.friend_id}
                              url={f.avatar_url}
                              name={f.display_name}
                              className="w-6 h-6 ring-2 ring-card"
                              targetUserId={f.friend_id}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          <strong className="text-foreground">{mutualFriends.length}</strong> mutual friend{mutualFriends.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {mutualFriendsList.map(f => f.display_name).filter(Boolean).join(', ')}
                        {mutualFriends.length > 5 && ` and ${mutualFriends.length - 5} more`}
                      </p>
                    </div>
                  )}

                  {/* Relationship badge */}
                  {relationship === 'blocked' && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                      <Ban className="w-3.5 h-3.5" />
                      Blocked
                    </div>
                  )}
                  {relationship === 'accepted' && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-accent bg-accent/10 rounded-lg px-3 py-2">
                      <UserCheck className="w-3.5 h-3.5" />
                      Friends
                    </div>
                  )}

                  {/* Action buttons */}
                  {renderActions()}

                  {/* Achievements */}
                  {unlockedAchievementList.length > 0 && (
                    <div className="border-t border-border/40 pt-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Trophy className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium">Achievements</span>
                        <span className="text-[10px] text-muted-foreground">({unlockedAchievementList.length})</span>
                        <button
                          onClick={() => setShowAchievements(true)}
                          className="ml-auto flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors font-medium"
                        >
                          <Eye className="w-3 h-3" />
                          View All
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {unlockedAchievementList.slice(0, 8).map(a => (
                          <div key={a.id} className="flex flex-col items-center gap-0.5">
                            <AchievementBadge
                              achievement={a}
                              unlocked
                              size="sm"
                              showDetails={false}
                            />
                            <span className="text-[8px] text-muted-foreground truncate max-w-[40px] text-center leading-tight">
                              {a.name}
                            </span>
                          </div>
                        ))}
                        {unlockedAchievementList.length > 8 && (
                          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary/40 text-[10px] text-muted-foreground font-medium">
                            +{unlockedAchievementList.length - 8}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <UserAchievementPreview
                    user={profile ? {
                      user_id: profile.user_id,
                      display_name: profile.display_name,
                      avatar_url: profile.avatar_url,
                      achievements: otherAchievements,
                    } : null}
                    open={showAchievements}
                    onClose={() => setShowAchievements(false)}
                  />
                </>
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  User not found
                </div>
              )}

              <ReportUserDialog
                isOpen={showReport}
                onClose={() => setShowReport(false)}
                reportedUserId={userId}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

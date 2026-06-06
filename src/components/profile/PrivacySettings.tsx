import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Users, Globe, Shield, MessageCircle, Flag, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ReportUserDialog } from './ReportUserDialog';

type PrivacyOption = 'everyone' | 'friends' | 'nobody';

interface PrivacySetting {
  key: string;
  label: string;
  description: string;
  value: PrivacyOption;
  onChange: (value: PrivacyOption) => void;
}

const options: { value: PrivacyOption; label: string; icon: typeof Globe }[] = [
  { value: 'everyone', label: 'Everyone', icon: Globe },
  { value: 'friends', label: 'Friends Only', icon: Users },
  { value: 'nobody', label: 'Nobody', icon: EyeOff },
];

export function PrivacyToggle({ label, description, value, onChange }: PrivacySetting) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-primary" />
          {label}
        </h4>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex gap-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border',
                isActive
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-secondary/30 border-border/40 text-muted-foreground hover:bg-secondary/50'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface BlockedUser {
  blocked_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function PrivacySettings({
  avatarPrivacy,
  profilePrivacy,
  lastSeenPrivacy,
  readReceiptsPrivacy,
  onlineStatusPrivacy,
  groupsPrivacy,
  onAvatarChange,
  onProfileChange,
  onLastSeenChange,
  onReadReceiptsChange,
  onOnlineStatusChange,
  onGroupsChange,
  otherUserId,
}: {
  avatarPrivacy: PrivacyOption;
  profilePrivacy: PrivacyOption;
  lastSeenPrivacy: PrivacyOption;
  readReceiptsPrivacy: PrivacyOption;
  onlineStatusPrivacy: PrivacyOption;
  groupsPrivacy: PrivacyOption;
  onAvatarChange: (v: PrivacyOption) => void;
  onProfileChange: (v: PrivacyOption) => void;
  onLastSeenChange: (v: PrivacyOption) => void;
  onReadReceiptsChange: (v: PrivacyOption) => void;
  onOnlineStatusChange: (v: PrivacyOption) => void;
  onGroupsChange: (v: PrivacyOption) => void;
  otherUserId?: string;
}) {
  const [showReport, setShowReport] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [showBlocked, setShowBlocked] = useState(false);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  const fetchBlocked = async () => {
    setLoadingBlocked(true);
    setShowBlocked(true);
    const { data } = await supabase.rpc('get_blocked_users');
    if (data) {
      const ids = data.map(b => b.blocked_id);
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', ids);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        setBlockedUsers(data.map(b => ({
          blocked_id: b.blocked_id,
          display_name: profileMap.get(b.blocked_id)?.display_name || 'Unknown',
          avatar_url: profileMap.get(b.blocked_id)?.avatar_url || null,
        })));
      } else {
        setBlockedUsers([]);
      }
    }
    setLoadingBlocked(false);
  };

  const handleUnblock = async (blockedId: string) => {
    const { error } = await supabase.rpc('unblock_user', { p_blocked_id: blockedId });
    if (error) { toast.error('Failed to unblock'); return; }
    setBlockedUsers(prev => prev.filter(b => b.blocked_id !== blockedId));
    toast.success('User unblocked');
  };

  const readReceiptsOn = readReceiptsPrivacy === 'everyone';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Privacy Controls</h3>
      </div>

      <PrivacyToggle
        key="avatar"
        label="Profile Picture"
        description="Who can see your profile picture?"
        value={avatarPrivacy}
        onChange={onAvatarChange}
      />
      <div className="h-px bg-border/50" />
      <PrivacyToggle
        key="profile"
        label="Profile Info"
        description="Who can view your profile details?"
        value={profilePrivacy}
        onChange={onProfileChange}
      />
      <div className="h-px bg-border/50" />
      <PrivacyToggle
        key="last_seen"
        label="Last Seen & Online"
        description="Who can see when you were last online?"
        value={lastSeenPrivacy}
        onChange={onLastSeenChange}
      />
      <div className="h-px bg-border/50" />
      <PrivacyToggle
        key="online_status"
        label="Online Status (green dot)"
        description="Who can see your online indicator?"
        value={onlineStatusPrivacy}
        onChange={onOnlineStatusChange}
      />
      <div className="h-px bg-border/50" />
      <PrivacyToggle
        key="groups"
        label="Groups"
        description="Who can add you to groups?"
        value={groupsPrivacy}
        onChange={onGroupsChange}
      />
      <div className="h-px bg-border/50" />

      {/* Read Receipts — On/Off toggle */}
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2">
            <MessageCircle className="w-3.5 h-3.5 text-primary" />
            Read Receipts
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Let others know when you've read their messages. If off, you won't see others' read receipts either.
          </p>
        </div>
        <button
          onClick={() => onReadReceiptsChange(readReceiptsOn ? 'nobody' : 'everyone')}
          className={cn(
            'w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all border',
            readReceiptsOn
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-secondary/30 border-border/40 text-muted-foreground'
          )}
        >
          <span className="flex items-center gap-2">
            {readReceiptsOn ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {readReceiptsOn ? 'On' : 'Off'}
          </span>
        </button>
      </div>
      <div className="h-px bg-border/50" />

      {/* Blocked Users */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Ban className="w-3.5 h-3.5 text-destructive" />
              Blocked Users
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">Manage users you've blocked</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => showBlocked ? setShowBlocked(false) : fetchBlocked()}>
            {showBlocked ? 'Hide' : `View (${blockedUsers.length})`}
          </Button>
        </div>
        {showBlocked && (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {loadingBlocked && <p className="text-xs text-muted-foreground py-2 text-center">Loading...</p>}
            {!loadingBlocked && blockedUsers.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center">No blocked users</p>
            )}
            {blockedUsers.map(bu => (
              <div key={bu.blocked_id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                  {bu.display_name?.[0] || '?'}
                </div>
                <span className="flex-1 text-xs font-medium truncate">{bu.display_name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => handleUnblock(bu.blocked_id)}
                >
                  Unblock
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="h-px bg-border/50" />

      {otherUserId && (
        <>
          <div className="h-px bg-border/50" />
          <div className="pt-2">
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <Flag className="w-3.5 h-3.5 text-destructive" />
              Report User
            </h4>
            <p className="text-xs text-muted-foreground mb-3">If this user is sending spam or abusive messages, you can report them to our team.</p>
            <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/30" onClick={() => setShowReport(true)}>
              <Flag className="w-3.5 h-3.5" />
              Report {otherUserId ? 'User' : ''}
            </Button>
          </div>
          <ReportUserDialog
            isOpen={showReport}
            onClose={() => setShowReport(false)}
            reportedUserId={otherUserId}
          />
        </>
      )}
    </motion.div>
  );
}

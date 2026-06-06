import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Edit3, LogOut, Trash2, Check, Loader2, Camera, UserMinus, Plus, Search, Shield, ShieldOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GroupMember {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface GroupInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  groupName: string;
  groupAvatar?: string | null;
  onDeleted?: () => void;
  onLeft?: () => void;
}

type ConfirmAction = 'kick' | 'leave' | 'delete' | null;

export function GroupInfoPanel({ isOpen, onClose, conversationId, groupName, groupAvatar, onDeleted, onLeft }: GroupInfoPanelProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(groupName);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(groupAvatar ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [confirmMemberId, setConfirmMemberId] = useState<string | null>(null);
  const [confirmMemberName, setConfirmMemberName] = useState('');

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GroupMember[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [muted, setMuted] = useState(false);

  const isAdmin = user && adminId === user.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !conversationId || !user) return;
    setLoading(true);
    setAddMemberOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setConfirmAction(null);
    setConfirmMemberId(null);

    Promise.all([
      supabase.from('conversations').select('created_by, group_avatar').eq('id', conversationId).single(),
      supabase.from('conversation_participants').select('user_id').eq('conversation_id', conversationId),
      supabase.rpc('is_muted', { p_conversation_id: conversationId }),
    ]).then(async ([convRes, partsRes, muteRes]) => {
      if (convRes.data?.created_by) setAdminId(convRes.data.created_by);
      if (convRes.data?.group_avatar) setAvatarUrl(convRes.data.group_avatar);
      setMuted(muteRes.data ?? false);
      if (!partsRes.error && partsRes.data && partsRes.data.length > 0) {
        const userIds = partsRes.data.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        setMembers(partsRes.data.map(p => ({
          user_id: p.user_id,
          display_name: profileMap.get(p.user_id)?.display_name ?? null,
          avatar_url: profileMap.get(p.user_id)?.avatar_url ?? null,
        })));
      } else if (!partsRes.error) {
        setMembers([]);
      }
      setLoading(false);
    });
  }, [isOpen, conversationId, user]);

  useEffect(() => { setNewName(groupName); }, [groupName]);

  useEffect(() => {
    if (!user || !isAdmin || searchQuery.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      const memberIds = new Set(members.map(m => m.user_id));
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .neq('user_id', user.id)
        .not('user_id', 'in', `(${[...memberIds].join(',')})`)
        .ilike('display_name', `%${searchQuery}%`)
        .limit(10);
      setSearchResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user, isAdmin, members]);

  const insertSystemMsg = async (type: string, content: string) => {
    try {
      await supabase.rpc('insert_group_system_message', {
        p_conversation_id: conversationId,
        p_message_type: type,
        p_content: content,
      });
    } catch { /* best effort */ }
  };

  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === groupName) { setEditingName(false); return; }
    if (trimmed.length > 50) { toast.error('Max 50 characters'); return; }
    setSaving(true);
    const { error } = await supabase.from('conversations').update({ group_name: trimmed }).eq('id', conversationId);
    if (error) toast.error('Failed to rename group');
    else {
      await insertSystemMsg('group_name_changed', `Group name changed to "${trimmed}"`);
      toast.success('Group renamed');
    }
    setSaving(false);
    setEditingName(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Avatar must be under 5MB'); return; }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/group-avatars/${conversationId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('chat-images').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const publicUrl = supabase.storage.from('chat-images').getPublicUrl(path).data?.publicUrl ?? null;
      if (!publicUrl) throw new Error('Failed to get public URL');
      const { error: updateError } = await supabase.from('conversations').update({ group_avatar: publicUrl }).eq('id', conversationId);
      if (updateError) throw updateError;
      setAvatarUrl(publicUrl);
      await insertSystemMsg('group_photo_changed', 'Group photo changed');
      toast.success('Group avatar updated');
    } catch { toast.error('Failed to upload avatar'); }
    setUploadingAvatar(false);
  };

  const handleLeave = async () => {
    if (!user) return;
    setLeaving(true);
    const { error } = await supabase.from('conversation_participants').delete().eq('conversation_id', conversationId).eq('user_id', user.id);
    if (error) { toast.error('Failed to leave group'); setLeaving(false); return; }
    await insertSystemMsg('group_member_left', `${user.email || 'A member'} left the group`);
    toast.success('Left group');
    onLeft?.();
    onClose();
  };

  const handleDelete = async () => {
    if (!user || !isAdmin) return;
    setDeleting(true);
    await supabase.from('conversation_participants').delete().eq('conversation_id', conversationId);
    await supabase.from('messages').delete().eq('conversation_id', conversationId);
    await supabase.from('conversations').delete().eq('id', conversationId);
    toast.success('Group deleted');
    setDeleting(false);
    onDeleted?.();
    onClose();
  };

  const handleKick = async (memberId: string) => {
    if (!isAdmin) return;
    const { error } = await supabase.from('conversation_participants').delete().eq('conversation_id', conversationId).eq('user_id', memberId);
    if (error) { toast.error('Failed to remove member'); return; }
    const kicked = members.find(m => m.user_id === memberId);
    setMembers(prev => prev.filter(m => m.user_id !== memberId));
    await insertSystemMsg('group_member_removed', `${kicked?.display_name || 'A member'} was removed`);
    toast.success('Member removed');
  };

  const handleAddMember = async (profile: GroupMember) => {
    if (!isAdmin) return;
    try {
      const { data: canAdd } = await supabase.rpc('can_add_to_group', { p_target_user_id: profile.user_id });
      if (canAdd === false) { toast.error('This user restricts being added to groups'); return; }
    } catch { /* RPC or column may not exist — assume allowed */ }
    setAddingMember(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from('conversation_participants').insert({
      conversation_id: conversationId,
      user_id: profile.user_id,
      last_read_at: now,
    });
    if (error) { toast.error('Failed to add member'); setAddingMember(false); return; }
    setMembers(prev => [...prev, profile]);
    setSearchResults(prev => prev.filter(p => p.user_id !== profile.user_id));
    setSearchQuery('');
    await insertSystemMsg('group_member_added', `${profile.display_name || 'User'} was added`);
    toast.success(`${profile.display_name || 'User'} added`);
    setAddingMember(false);
  };

  const handleTransferAdmin = async (newAdminId: string) => {
    if (!isAdmin || adminId !== user?.id) return;
    const { error } = await supabase.from('conversations').update({ created_by: newAdminId }).eq('id', conversationId);
    if (error) { toast.error('Failed to transfer admin'); return; }
    setAdminId(newAdminId);
    await insertSystemMsg('group_admin_promoted', `${members.find(m => m.user_id === newAdminId)?.display_name || 'A member'} was promoted to admin`);
    toast.success('Admin transferred');
  };

  const handleDemoteAdmin = async () => {
    if (!isAdmin || !user) return;
    const oldest = members.filter(m => m.user_id !== user.id).sort((a, b) => a.user_id.localeCompare(b.user_id))[0];
    if (!oldest) return;
    await handleTransferAdmin(oldest.user_id);
  };

  const handleToggleMute = async () => {
    const { data } = await supabase.rpc('toggle_mute_conversation', { p_conversation_id: conversationId });
    if (typeof data === 'boolean') setMuted(data);
  };

  const requestConfirm = (action: ConfirmAction, memberId?: string, memberName?: string) => {
    setConfirmAction(action);
    setConfirmMemberId(memberId ?? null);
    setConfirmMemberName(memberName ?? '');
  };

  const executeConfirmed = () => {
    if (confirmAction === 'kick' && confirmMemberId) handleKick(confirmMemberId);
    else if (confirmAction === 'leave') handleLeave();
    else if (confirmAction === 'delete') handleDelete();
    setConfirmAction(null);
    setConfirmMemberId(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl border shadow-xl w-full max-w-sm max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h2 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" />
                Group Info
              </h2>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-border shrink-0 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0 group">
                  <UserAvatar
                    url={avatarUrl}
                    name={groupName}
                    className="w-14 h-14"
                    fallback={<Users className="w-6 h-6 text-primary" />}
                    viewable
                  />
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 rounded-full bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center"
                        title="Change avatar"
                      >
                        {uploadingAvatar ? (
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        ) : (
                          <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {editingName ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        maxLength={50}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                      />
                      <Button size="sm" variant="ghost" className="h-8 w-8 rounded-full p-0" onClick={handleSaveName} disabled={saving}>
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate">{groupName}</span>
                      {isAdmin && (
                        <button onClick={() => setEditingName(true)} className="p-0.5 rounded hover:bg-accent shrink-0">
                          <Edit3 className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  )}
                  <span className="text-[10px] text-muted-foreground">{members.length} member{members.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {addMemberOpen && isAdmin && (
              <div className="p-3 border-b border-border shrink-0 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users to add..."
                    className="pl-8 bg-secondary/50 h-8 text-xs"
                    autoFocus
                  />
                </div>
                {searching && <p className="text-xs text-muted-foreground text-center py-1">Searching...</p>}
                {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-1">No users found</p>
                )}
                <div className="max-h-32 overflow-y-auto space-y-0.5">
                  {searchResults.map(profile => (
                    <button
                      key={profile.user_id}
                      onClick={() => handleAddMember(profile)}
                      disabled={addingMember}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors text-left"
                    >
                      <UserAvatar url={profile.avatar_url} name={profile.display_name} className="w-7 h-7" targetUserId={profile.user_id} />
                      <span className="flex-1 text-xs font-medium truncate">{profile.display_name || 'User'}</span>
                      <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {isAdmin && (
                    <button
                      onClick={() => setAddMemberOpen(v => !v)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Plus className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">Add Members</span>
                    </button>
                  )}
                  {members.map((member) => {
                    const isMemberAdmin = member.user_id === adminId;
                    const isSelf = member.user_id === user?.id;
                    return (
                      <div
                        key={member.user_id}
                        className="flex items-center gap-3 p-2.5 rounded-xl group"
                      >
                        <UserAvatar url={member.avatar_url} name={member.display_name} className="w-9 h-9" targetUserId={member.user_id} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">
                              {member.display_name || 'User'}
                            </span>
                            {isMemberAdmin && (
                              <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0 font-medium">
                                admin
                              </span>
                            )}
                          </div>
                          {isSelf && <span className="text-[10px] text-muted-foreground">You</span>}
                        </div>
                        {isAdmin && !isSelf && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isMemberAdmin ? (
                              members.length > 1 && (
                                <button
                                  onClick={handleDemoteAdmin}
                                  className="p-1 rounded-lg hover:bg-accent transition-colors"
                                  title="Demote from admin"
                                >
                                  <ShieldOff className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                              )
                            ) : (
                              <>
                                <button
                                  onClick={() => handleTransferAdmin(member.user_id)}
                                  className="p-1 rounded-lg hover:bg-accent transition-colors"
                                  title="Promote to admin"
                                >
                                  <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                                <button
                                  onClick={() => requestConfirm('kick', member.user_id, member.display_name || 'User')}
                                  className="p-1 rounded-lg hover:bg-destructive/10 transition-colors"
                                  title="Remove from group"
                                >
                                  <UserMinus className="w-3.5 h-3.5 text-destructive" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <div className="p-4 border-t border-border shrink-0 space-y-2">
              <button
                onClick={handleToggleMute}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-accent/50 transition-colors text-sm"
              >
                <span>Mute notifications</span>
                <span className={cn("text-xs font-medium", muted ? "text-primary" : "text-muted-foreground")}>
                  {muted ? 'Muted' : 'Unmuted'}
                </span>
              </button>
              {isAdmin && members.length > 1 && (
                <Button
                  variant="outline"
                  className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => requestConfirm('delete')}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete Group
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full gap-2 border-muted-foreground/30 hover:bg-accent"
                onClick={() => requestConfirm('leave')}
                disabled={leaving}
              >
                {leaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                {isAdmin ? 'Leave & Transfer Group' : 'Leave Group'}
              </Button>
            </div>
          </motion.div>

          {/* Confirmation dialog overlay */}
          <AnimatePresence>
            {confirmAction && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={() => setConfirmAction(null)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-card rounded-2xl border shadow-xl p-5 max-w-xs w-full text-center space-y-4"
                >
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {confirmAction === 'kick' && `Remove ${confirmMemberName}?`}
                      {confirmAction === 'leave' && 'Leave this group?'}
                      {confirmAction === 'delete' && 'Delete this group?'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {confirmAction === 'kick' && 'They will not be able to rejoin without an invite.'}
                      {confirmAction === 'leave' && isAdmin && 'Admin will be transferred to the oldest member.'}
                      {confirmAction === 'leave' && !isAdmin && 'You can be re-added by an admin later.'}
                      {confirmAction === 'delete' && 'All messages and media will be permanently deleted.'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setConfirmAction(null)}>Cancel</Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={executeConfirmed}
                    >
                      {confirmAction === 'delete' ? 'Delete' : confirmAction === 'leave' ? 'Leave' : 'Remove'}
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

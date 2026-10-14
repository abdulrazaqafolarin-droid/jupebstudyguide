import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, Users, Camera, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useImageCompression } from '@/hooks/useImageCompression';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Profile } from '@/hooks/useChat';

interface GroupCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}

export function GroupCreateDialog({ isOpen, onClose, onCreated }: GroupCreateDialogProps) {
  const { user } = useAuth();
  const { compressImage } = useImageCompression();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarPreviewRef = useRef<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const [groupAvatarFile, setGroupAvatarFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      if (avatarPreviewRef.current) {
        URL.revokeObjectURL(avatarPreviewRef.current);
        avatarPreviewRef.current = null;
      }
      setSearchQuery('');
      setResults([]);
      setSelected([]);
      setGroupName('');
      setGroupAvatar(null);
      setGroupAvatarFile(null);
      setNameError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!user || searchQuery.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .neq('user_id', user.id)
        .ilike('display_name', `%${searchQuery}%`)
        .limit(10);
      setResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const toggleSelect = (profile: Profile) => {
    setSelected(prev =>
      prev.some(p => p.user_id === profile.user_id)
        ? prev.filter(p => p.user_id !== profile.user_id)
        : [...prev, profile]
    );
  };

  function generateId(): string {
    try {
      return crypto.randomUUID();
    } catch {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      arr[6] = (arr[6] & 0x0f) | 0x40;
      arr[8] = (arr[8] & 0x3f) | 0x80;
      return Array.from(arr, (b, i) =>
        [4, 6, 8, 10].includes(i) ? '-' + b.toString(16).padStart(2, '0')
          : i === 0 ? b.toString(16).padStart(2, '0')
          : b.toString(16).padStart(2, '0')
      ).join('');
    }
  }

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image too large (max 5MB)'); return; }
    const compressed = await compressImage(file, 512, 0.8);
    // Revoke the previous preview so repeated picks don't leak blob URLs.
    if (avatarPreviewRef.current) {
      URL.revokeObjectURL(avatarPreviewRef.current);
      avatarPreviewRef.current = null;
    }
    const previewUrl = URL.createObjectURL(compressed);
    avatarPreviewRef.current = previewUrl;
    setGroupAvatar(previewUrl);
    const compressedFile = new File([compressed], file.name, { type: (compressed as Blob).type || 'image/jpeg' });
    setGroupAvatarFile(compressedFile);
  };

  const handleCreate = async () => {
    const trimmed = groupName.trim();
    if (!trimmed) { setNameError('Group name is required'); return; }
    if (trimmed.length > 50) { setNameError('Max 50 characters'); return; }
    if (!user || selected.length < 2) { toast.error('Select at least 2 members'); return; }
    setCreating(true);

    const memberIds = [user.id, ...new Set(selected.map(p => p.user_id))];
    const groupConvId = generateId();

    const cleanup = async () => {
      try {
        await supabase.from('conversation_participants').delete().eq('conversation_id', groupConvId);
        await supabase.from('conversations').delete().eq('id', groupConvId);
      } catch { /* best effort */ }
    };

    try {
      let avatarUrl: string | null = null;
      if (groupAvatarFile) {
        const rawExt = groupAvatarFile.name.split('.').pop() || 'jpg';
        const ext = /^[a-z0-9]{1,5}$/i.test(rawExt) ? rawExt.toLowerCase() : 'jpg';
        const path = `${user.id}/group-avatars/${groupConvId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('chat-images')
          .upload(path, groupAvatarFile, { cacheControl: '3600', upsert: true, contentType: groupAvatarFile.type || undefined });
        if (!uploadError) {
          avatarUrl = supabase.storage.from('chat-images').getPublicUrl(path).data?.publicUrl ?? null;
        }
      }

      const { error: convError } = await supabase
        .from('conversations')
        .insert({ id: groupConvId, group_name: trimmed, created_by: user.id, group_avatar: avatarUrl });
      if (convError) throw new Error('Failed to create group');

      const now = new Date().toISOString();
      // Insert creator first so RLS policy (user_id = auth.uid()) passes
      const { error: selfError } = await supabase
        .from('conversation_participants')
        .insert({ conversation_id: groupConvId, user_id: user.id, last_read_at: now });
      if (selfError) {
        await cleanup();
        throw new Error('Failed to add members');
      }
      // Now insert remaining members — creator is already a participant,
      // so is_conversation_participant(conversation_id, auth.uid()) returns true
      const otherIds = memberIds.filter(id => id !== user.id);
      if (otherIds.length > 0) {
        const { error: memberError } = await supabase
          .from('conversation_participants')
          .insert(otherIds.map(memberId => ({
            conversation_id: groupConvId,
            user_id: memberId,
            last_read_at: now,
          })));
        if (memberError) {
          await cleanup();
          throw new Error('Failed to add members');
        }
      }

      let creatorName = 'Someone';
      try {
        const { data: ownProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle();
        const dn = (ownProfile as { display_name?: string | null } | null)?.display_name;
        if (dn) creatorName = dn;
      } catch { /* fall back to generic label */ }
      try {
        await supabase.rpc('insert_group_system_message', {
          p_conversation_id: groupConvId,
          p_message_type: 'group_created',
          p_content: `${creatorName} created this group`,
        });
      } catch { /* best effort */ }

      setCreating(false);
      onCreated(groupConvId);
      onClose();
    } catch (err) {
      console.error('Group create error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create group');
      setCreating(false);
    }
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
            className="bg-card rounded-2xl border shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h2 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" />
                Create Group
              </h2>
              <button onClick={onClose} aria-label="Close" className="p-1 rounded-lg hover:bg-accent transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Choose group avatar"
                  className="relative w-14 h-14 rounded-full overflow-hidden bg-secondary shrink-0 hover:opacity-80 transition-opacity"
                >
                  {groupAvatar ? (
                    <img src={groupAvatar} alt="Group" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
                <div className="flex-1">
                  <Input
                    value={groupName}
                    onChange={(e) => { setGroupName(e.target.value); if (nameError) setNameError(''); }}
                    placeholder="Group name *"
                    maxLength={50}
                    className={cn("bg-secondary/50 text-sm", nameError && "border-destructive")}
                  />
                  {nameError && <p className="text-xs text-destructive mt-1">{nameError}</p>}
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users to add..."
                  className="pl-9 bg-secondary/50 text-sm"
                />
              </div>
            </div>

            {/* Selected users chips */}
            {selected.length > 0 && (
              <div className="px-4 py-2 flex gap-1.5 flex-wrap border-b border-border shrink-0">
                {selected.map(p => (
                  <span key={p.user_id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-xs font-medium">
                    {p.display_name || 'User'}
                    <button onClick={() => toggleSelect(p)} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {searching && (
                <p className="text-xs text-muted-foreground text-center py-4">Searching...</p>
              )}
              {!searching && searchQuery.length >= 2 && results.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No users found</p>
              )}
              {results.map(profile => {
                const isSelected = selected.some(p => p.user_id === profile.user_id);
                return (
                  <button
                    key={profile.user_id}
                    onClick={() => toggleSelect(profile)}
                    className={cn(
                      'w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left',
                      isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-accent/50'
                    )}
                  >
                    <UserAvatar url={profile.avatar_url} name={profile.display_name} className="w-9 h-9" targetUserId={profile.user_id} />
                    <span className="flex-1 text-sm font-medium truncate">{profile.display_name || 'User'}</span>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-border shrink-0">
              <Button
                onClick={handleCreate}
                disabled={selected.length < 2 || creating}
                className="w-full"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : `Create Group (${selected.length + 1} members)`}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

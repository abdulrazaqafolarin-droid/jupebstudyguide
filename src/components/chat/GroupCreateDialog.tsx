import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setResults([]);
      setSelected([]);
      setGroupName('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!user || searchQuery.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
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

  const handleCreate = async () => {
    if (!user || selected.length < 1) return;
    setCreating(true);

    const allMembers = [user.id, ...selected.map(p => p.user_id)];
    const name = groupName.trim() || `${selected.map(p => p.display_name || 'User').join(', ')}`;

    const groupConvId = crypto.randomUUID();
    const { error } = await supabase
      .from('conversations')
      .insert({ id: groupConvId });

    if (error) {
      console.error('Group create error:', error);
      toast.error('Failed to create group');
      setCreating(false);
      return;
    }

    // Insert self first, then others (RLS requires self to already be a participant)
    const { error: selfError } = await supabase
      .from('conversation_participants')
      .insert({ conversation_id: groupConvId, user_id: user.id });

    if (selfError) {
      console.error('Self insert error:', selfError);
      toast.error('Failed to create group');
      setCreating(false);
      return;
    }

    const otherMembers = allMembers.filter(mid => mid !== user.id);
    for (const memberId of otherMembers) {
      const { error: memError } = await supabase
        .from('conversation_participants')
        .insert({ conversation_id: groupConvId, user_id: memberId });

      if (memError) {
        console.error('Member insert error:', memError);
        toast.error(`Failed to add ${memberId.substring(0, 8)}`);
        setCreating(false);
        return;
      }
    }

    // Update group name in last message or metadata
    await supabase
      .from('messages')
      .insert({
        conversation_id: groupConvId,
        sender_id: user.id,
        content: name,
        group_name: name,
      });

    setCreating(false);
    onCreated(groupConvId);
    onClose();
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
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 border-b border-border shrink-0">
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name (optional)"
                className="bg-secondary/50 text-sm"
              />
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
                    <UserAvatar url={profile.avatar_url} name={profile.display_name} className="w-9 h-9" />
                    <span className="flex-1 text-sm font-medium truncate">{profile.display_name || 'User'}</span>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-border shrink-0">
              <Button
                onClick={handleCreate}
                disabled={selected.length < 1 || creating}
                className="w-full"
              >
                {creating ? 'Creating...' : `Create Group (${selected.length + 1} members)`}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

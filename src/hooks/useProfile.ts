import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  privacy_avatar: string;
  privacy_profile: string;
  privacy_last_seen: string;
  privacy_read_receipts: string;
  privacy_activity_status: string;
  privacy_online_status: string;
  privacy_groups: string;
  achievements: string[];
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url, bio, privacy_avatar, privacy_profile, privacy_last_seen, privacy_read_receipts, privacy_activity_status, privacy_online_status, privacy_groups, achievements')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        if (!data.display_name && user.email) {
          const fallback = user.email.split('@')[0];
          await supabase
            .from('profiles')
            .update({ display_name: fallback })
            .eq('user_id', user.id);
          data.display_name = fallback;
        }
        setProfile({
          ...data,
          achievements: Array.isArray(data.achievements)
            ? data.achievements.filter((a): a is string => typeof a === 'string')
            : [],
        });
      } else {
        const fallback = user.email?.split('@')[0] || 'Student';
        const { data: created } = await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            display_name: fallback,
          }, { onConflict: 'user_id' })
          .select()
          .single();
        setProfile(created ? {
          ...created,
          achievements: Array.isArray(created.achievements)
            ? created.achievements.filter((a): a is string => typeof a === 'string')
            : [],
        } : null);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      toast.error('Failed to load profile');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<Profile, 'display_name' | 'avatar_url' | 'bio'>>) => {
      if (!user) return { error: new Error('Not authenticated') };
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('user_id', user.id)
        .select()
        .single();
      if (!error && data) setProfile(data as Profile);
      return { error };
    },
    [user],
  );

  const syncAchievements = useCallback(
    async (achievementIds: string[]) => {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .update({ achievements: achievementIds })
        .eq('user_id', user.id)
        .select()
        .single();
      if (!error && data) setProfile(data as Profile);
      return { error };
    },
    [user],
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!user) return { error: new Error('Not authenticated'), url: null };
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) return { error: upErr, url: null };

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: updErr } = await updateProfile({ avatar_url: url });
      return { error: updErr ?? null, url };
    },
    [user, updateProfile],
  );

  return { profile, loading, refetch: fetchProfile, updateProfile, uploadAvatar, syncAchievements };
}

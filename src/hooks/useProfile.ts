import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * Per-user profile loader. Always scoped to the currently authenticated user.
 * Returns the profile row, an updater, and an avatar uploader.
 */
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
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
    } else {
      // Defensive: trigger should create the row, but ensure existence.
      const { data: created } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          display_name: user.email?.split('@')[0] ?? null,
        })
        .select()
        .single();
      setProfile(created ?? null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<Profile, 'display_name' | 'avatar_url'>>) => {
      if (!user) return { error: new Error('Not authenticated') };
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('user_id', user.id)
        .select()
        .single();
      if (!error && data) setProfile(data);
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

  return { profile, loading, refetch: fetchProfile, updateProfile, uploadAvatar };
}

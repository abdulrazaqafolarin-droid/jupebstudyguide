import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MutualFriend {
  friend_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function useMutualFriends() {
  const { user } = useAuth();
  const [mutualFriends, setMutualFriends] = useState<MutualFriend[]>([]);
  const [loading, setLoading] = useState(false);

  const getMutualFriends = useCallback(async (targetUserId: string) => {
    if (!user) return { data: [] as MutualFriend[], error: null };
    setLoading(true);
    const { data, error } = await supabase
      .rpc('get_mutual_friends', {
        user_a: user.id,
        user_b: targetUserId,
      });

    const friends = (data || []) as MutualFriend[];
    setMutualFriends(friends);
    setLoading(false);
    return { data: friends, error };
  }, [user]);

  return { mutualFriends, loading, getMutualFriends };
}

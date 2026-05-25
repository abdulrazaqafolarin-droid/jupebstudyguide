import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  sender?: { display_name: string | null; avatar_url: string | null };
  receiver?: { display_name: string | null; avatar_url: string | null };
}

export interface FriendProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  online?: boolean;
}

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [friendsData, incomingData, outgoingData] = await Promise.all([
      supabase.rpc('get_friends', { user_id: user.id }),
      supabase.from('friend_requests')
        .select('*, sender:profiles!sender_id(display_name, avatar_url)')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase.from('friend_requests')
        .select('*, receiver:profiles!receiver_id(display_name, avatar_url)')
        .eq('sender_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);

    setFriends((friendsData.data || []).map((f: Record<string, unknown>) => ({
      user_id: f.friend_id as string,
      display_name: f.display_name as string | null,
      avatar_url: f.avatar_url as string | null,
    })));
    setIncomingRequests(incomingData.data || []);
    setOutgoingRequests(outgoingData.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time subscription for friend_requests
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('friend-requests-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${user.id}` },
        () => { fetchData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests', filter: `sender_id=eq.${user.id}` },
        () => { fetchData(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchData]);

  const sendRequest = useCallback(async (receiverId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data: existing } = await supabase
      .from('friend_requests')
      .select('id, status')
      .eq('sender_id', user.id)
      .eq('receiver_id', receiverId)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') {
        return { error: new Error('Already friends') };
      }
      if (existing.status === 'pending') {
        return { error: new Error('Request already sent') };
      }
      if (existing.status === 'rejected') {
        const { error } = await supabase
          .from('friend_requests')
          .update({ status: 'pending', updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (!error) await fetchData();
        return { error };
      }
    }

    const { error } = await supabase.from('friend_requests').insert({
      sender_id: user.id,
      receiver_id: receiverId,
    });
    if (!error) await fetchData();
    return { error };
  }, [user, fetchData]);

  const respondToRequest = useCallback(async (requestId: string, accept: boolean) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('id', requestId);
    if (!error) await fetchData();
    return { error };
  }, [user, fetchData]);

  const removeFriend = useCallback(async (friendUserId: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendUserId}),and(sender_id.eq.${friendUserId},receiver_id.eq.${user.id})`)
      .eq('status', 'accepted');
    if (!error) await fetchData();
    return { error };
  }, [user, fetchData]);

  const cancelRequest = useCallback(async (requestId: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId);
    if (!error) await fetchData();
    return { error };
  }, [user, fetchData]);

  return {
    friends, incomingRequests, outgoingRequests, loading,
    sendRequest, respondToRequest, removeFriend, cancelRequest, refresh: fetchData,
  };
}

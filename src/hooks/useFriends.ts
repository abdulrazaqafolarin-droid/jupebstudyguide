import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

    try {
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
    } catch (err) {
      console.error('Failed to fetch friends data:', err);
      toast.error('Failed to load friends');
      setFriends([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sendRequest = useCallback(async (receiverId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase.rpc('send_friend_request', {
      receiver_id: receiverId,
    });

    if (error) return { error };
    const result = data as unknown as { success?: boolean; error?: string };
    if (result?.error) return { error: new Error(result.error) };

    await fetchData();
    return { error: null };
  }, [user, fetchData]);

  const respondToRequest = useCallback(async (requestId: string, accept: boolean) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .rpc('handle_friend_request', { request_id: requestId, accept });
    if (error) return { error };
    const result = data as unknown as { error?: string };
    if (result?.error) return { error: new Error(result.error) };
    if (!error) await fetchData();
    return { error: null };
  }, [user, fetchData]);

  const removeFriend = useCallback(async (friendUserId: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendUserId}),and(sender_id.eq.${friendUserId},receiver_id.eq.${user.id})`);
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

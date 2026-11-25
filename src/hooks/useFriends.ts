import { useState, useEffect, useCallback, useRef } from 'react';
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
  const fetchVersionRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!user) {
      // Invalidate any in-flight request from the previous signed-in account.
      fetchVersionRef.current += 1;
      setFriends([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setLoading(false);
      return;
    }
    const requestVersion = ++fetchVersionRef.current;
    setLoading(true);

    try {
      const [friendsData, incomingData, outgoingData] = await Promise.all([
        supabase.rpc('get_friends', { user_id: user.id }),
        supabase.from('friend_requests')
          .select('id, sender_id, receiver_id, status, created_at')
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        supabase.from('friend_requests')
          .select('id, sender_id, receiver_id, status, created_at')
          .eq('sender_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ]);

      if (friendsData.error) throw friendsData.error;
      if (incomingData.error) throw incomingData.error;
      if (outgoingData.error) throw outgoingData.error;

      const incoming = incomingData.data ?? [];
      const outgoing = outgoingData.data ?? [];
      const counterpartIds = [...new Set([
        ...incoming.map((request) => request.sender_id),
        ...outgoing.map((request) => request.receiver_id),
      ])];

      const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
      if (counterpartIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', counterpartIds);
        if (profilesError) throw profilesError;

        for (const profile of profiles ?? []) {
          profileMap.set(profile.user_id, {
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          });
        }
      }

      if (requestVersion !== fetchVersionRef.current) return;

      setFriends((friendsData.data ?? []).map((friend: Record<string, unknown>) => ({
        user_id: friend.friend_id as string,
        display_name: friend.display_name as string | null,
        avatar_url: friend.avatar_url as string | null,
      })));
      setIncomingRequests(incoming.map((request) => ({
        id: request.id,
        sender_id: request.sender_id,
        receiver_id: request.receiver_id,
        status: request.status as FriendRequest['status'],
        created_at: request.created_at,
        sender: profileMap.get(request.sender_id) || { display_name: null, avatar_url: null },
      })));
      setOutgoingRequests(outgoing.map((request) => ({
        id: request.id,
        sender_id: request.sender_id,
        receiver_id: request.receiver_id,
        status: request.status as FriendRequest['status'],
        created_at: request.created_at,
        receiver: profileMap.get(request.receiver_id) || { display_name: null, avatar_url: null },
      })));
    } catch (err) {
      if (requestVersion !== fetchVersionRef.current) return;
      console.error('[useFriends] Failed to fetch friends data:', err);
      toast.error('Could not refresh your friends. Check your connection and try again.');
    } finally {
      if (requestVersion === fetchVersionRef.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time subscription for friend_requests
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`friend-requests-live-${user.id}`)
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
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          // The subscription snapshot closes any gap between the initial fetch
          // and joining Realtime, and runs again after reconnects.
          void fetchData();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('[useFriends] Realtime channel state:', status, error);
        }
      });
    return () => { void supabase.removeChannel(channel); };
  }, [user, fetchData]);

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

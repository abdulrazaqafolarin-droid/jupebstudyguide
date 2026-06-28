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

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const safe = (p: Promise<{ data: unknown; error: unknown }>, label: string) =>
      p.then(r => {
        if (r.error) console.error(`useFriends: ${label} error:`, r.error);
        return (r.data || []) as Record<string, unknown>[];
      });

    const [friendsRaw, incomingRows, outgoingRows, profileRows] = await Promise.all([
      safe(
        supabase.from('friend_requests')
          .select('*')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq('status', 'accepted'),
        'friends query'
      ),
      safe(
        supabase.from('friend_requests')
          .select('*')
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        'incoming query'
      ),
      safe(
        supabase.from('friend_requests')
          .select('*')
          .eq('sender_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        'outgoing query'
      ),
      safe(
        supabase.from('profiles')
          .select('user_id, display_name, avatar_url'),
        'profiles query'
      ),
    ]);

    const profileMap = new Map(
      profileRows.map((p) => [
        p.user_id as string,
        { display_name: p.display_name as string | null, avatar_url: p.avatar_url as string | null },
      ])
    );

    const friendIds = friendsRaw.map((r) =>
      r.sender_id === user.id ? r.receiver_id : r.sender_id
    ) as string[];
    setFriends(
      friendIds.map((id) => ({
        user_id: id,
        display_name: profileMap.get(id)?.display_name ?? null,
        avatar_url: profileMap.get(id)?.avatar_url ?? null,
      }))
    );

    setIncomingRequests(
      incomingRows.map((r) => ({
        ...r,
        sender: profileMap.get(r.sender_id as string) || null,
      })) as FriendRequest[]
    );
    setOutgoingRequests(
      outgoingRows.map((r) => ({
        ...r,
        receiver: profileMap.get(r.receiver_id as string) || null,
      })) as FriendRequest[]
    );

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

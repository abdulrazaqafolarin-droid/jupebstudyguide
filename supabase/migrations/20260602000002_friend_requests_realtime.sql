-- Add friend_requests to supabase_realtime publication
-- Without this, friend request notifications and real-time updates don't work

ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;

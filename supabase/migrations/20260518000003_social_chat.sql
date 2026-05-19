-- Social Chat features: friend requests, message reactions, image messages

-- Friend requests table
CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

CREATE INDEX idx_friend_requests_receiver ON public.friend_requests(receiver_id, status);
CREATE INDEX idx_friend_requests_sender ON public.friend_requests(sender_id, status);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friend requests"
  ON public.friend_requests FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send friend requests"
  ON public.friend_requests FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update requests they received"
  ON public.friend_requests FOR UPDATE TO authenticated
  USING (receiver_id = auth.uid());

-- Add message_type, reply_to, reactions, image_url to messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reactions JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS group_name TEXT;

-- Create trigger for friend_requests updated_at
CREATE TRIGGER update_friend_requests_updated_at
  BEFORE UPDATE ON public.friend_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add friends list function
CREATE OR REPLACE FUNCTION public.get_friends(user_id uuid)
RETURNS TABLE(friend_id uuid, display_name text, avatar_url text, online_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE WHEN fr.sender_id = get_friends.user_id THEN fr.receiver_id ELSE fr.sender_id END,
    p.display_name,
    p.avatar_url,
    NULL::timestamptz
  FROM public.friend_requests fr
  JOIN public.profiles p ON p.user_id = CASE WHEN fr.sender_id = get_friends.user_id THEN fr.receiver_id ELSE fr.sender_id END
  WHERE (fr.sender_id = get_friends.user_id OR fr.receiver_id = get_friends.user_id)
    AND fr.status = 'accepted';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_friends(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_friends(uuid) TO authenticated;
